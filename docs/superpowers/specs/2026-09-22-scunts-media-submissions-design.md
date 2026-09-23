# Scunts Media Submissions (Photo + Video Proof) — Design

*Owner:* Raph · *Status:* Draft · *Date:* 2026-09-22

## Purpose

Let students upload photo and video proof of Scunts scavenger-hunt tasks from a phone
or a laptop, and let everyone signed in browse what has been submitted. Execs judge the
proof by eye and award points through the **existing** scoring panel — this feature
stores and shows media, it does not score.

## Scope

**In scope:** upload an image or a short video with a free-text caption; a gallery of
all submissions readable by any signed-in user; exec takedown of a submission.

**Out of scope (deferred):** a predefined task list; approve/reject status; automatic
point awards or any write into `scoreEntries`; thumbnail generation; pagination;
students deleting their own submissions; tying a submission to an `events` document;
server-side video transcoding.

## Decisions

- **Photos are evidence only.** No coupling to `internal/scores`. Execs look at the
  gallery and award points by hand as they do today. This keeps the module free of the
  leaderboard entirely, the way `cscomp` is.
- **Free-form captions, no task list.** A submission carries a typed caption rather
  than a foreign key to a task, so there is no task CRUD to build or seed.
- **Everyone signed in can see every submission.** Not team-scoped. This is a
  deliberate trade: teams can see each other's answers, but the gallery is the point.
  It is *not* public — signed-out visitors get nothing, unlike the schedule.
- **Exec takedown is in v1**, not deferred. Because every signed-in user sees every
  upload, there must be a way to remove something inappropriate. Logged to
  `internal/audit` like every other exec action.
- **Cloudflare R2 for storage, with presigned direct uploads.** The browser PUTs
  straight to R2, so a 100 MB video never passes through the Go container — its
  `ReadTimeout` (30 s) and 1 MB body cap therefore need no change. R2 charges no
  egress, which matters because video is watched repeatedly.
- **The server stays authoritative about what was stored.** The client reports an
  object key; the backend HEADs that object in R2 and checks type and size before
  writing a Mongo row. Same principle as `cscomp` rendering submissions itself rather
  than trusting a client-reported score.
- **Object keys are server-generated**, never client-supplied, so one client cannot
  overwrite another's object.
- **Media is scoped to the uploader's Games team** (recorded on the submission), so a
  student must have completed onboarding before uploading.

## Limits

| Thing | Limit | Enforced |
|-------|-------|----------|
| Image size | 10 MB | client (post-compression) + server HEAD |
| Video size | 100 MB | client (`file.size`) + server HEAD |
| Video duration | 60 s | client (`<video>` metadata) only |
| Caption | 1–200 chars, required | client + server |
| Content types | `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime` | server, both on presign and HEAD |

Duration is client-only on purpose: reading it server-side means parsing container
metadata, which is a large dependency for a soft limit the size cap already bounds.

## Data model

New Mongo collection `scuntsSubmissions`. New package `internal/scunts`.

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectID | |
| `team` | `models.Team` | the uploader's Games team, snapshotted |
| `key` | string | R2 object key, `scunts/<team>/<objectid>.<ext>` |
| `kind` | string | `image` or `video`, derived from content type |
| `contentType` | string | as confirmed by the HEAD, not as claimed |
| `size` | int64 | as confirmed by the HEAD |
| `caption` | string | free text, required — it is what identifies the task |
| `submittedBy` | string | Clerk user ID |
| `submittedByName` | string | display name snapshotted at write time, matching how `audit` records an actor |
| `submittedAt` | time.Time | |

Index: `submittedAt` descending, for the newest-first listing.

Object IDs come from `primitive.NewObjectID().Hex()` rather than a UUID package — the
Mongo driver is already a dependency and the values are equally unguessable.

## Backend (Go)

New module `internal/scunts`, following the store/domain/routes shape of `events` and
`scores`:

- `scunts.go` — the `Submission` type, the limit constants, content-type allowlist.
- `store.go` — Mongo access: `Insert`, `List`, `Get`, `Delete`, `EnsureIndexes`.
- `storage.go` — R2 client built on `aws-sdk-go-v2` (S3-compatible): `PresignPut`,
  `PresignGet`, `Head`, `Delete`. Region `auto`, endpoint
  `https://<account>.r2.cloudflarestorage.com`, static credentials.
- `routes.go` — handlers and `Mount(r, h, userRepo, clerkSecretKey)`.

### Routes

| Method | Path | Auth | Behaviour |
|--------|------|------|-----------|
| `POST` | `/api/scunts/upload-url` | `RequireAuth` | Body `{contentType, size}`. Rejects a disallowed type or an over-limit size with 400. Requires the caller to have a team (409 if not). Returns `{uploadUrl, key}`; the URL expires in 5 minutes. |
| `POST` | `/api/scunts/submissions` | `RequireAuth` | Body `{key, caption}`. Rejects a key not owned by this caller's team prefix. HEADs the object: 400 if missing, wrong type, or over limit. Inserts and returns the submission. |
| `GET` | `/api/scunts/submissions` | `RequireAuth` | Newest first, capped at 200. Each item carries a presigned GET URL valid 1 hour. |
| `DELETE` | `/api/scunts/submissions/{id}` | `RequireAuth` + `RequireRole(exec)` | Deletes the R2 object and the Mongo row, and records an `audit` entry. |

All four sit behind `RequireAuth` — nothing here is public, in contrast to the
schedule.

### Degradation

If the R2 environment variables are unset, `NewStorage` returns an error; `main.go`
logs it and mounts the module with a nil storage client, and **every** route then
returns 503. Unlike the CS comp — where reads survive a missing Chrome because
challenges and claims do not need it — listing here also depends on storage, since
each item needs a presigned URL. Mounting anyway means a misconfigured deploy fails
with an explicit 503 rather than a 404 that looks like a routing bug.

### Wiring in `cmd/api/main.go`

Inside the existing `if database != nil` block, alongside the other modules: build the
store, call `EnsureIndexes` (fatal on failure, like the others), build the storage
client (logged, not fatal), then `scunts.Mount(...)`.

## Frontend (Next.js)

- `app/(app)/scunts/page.tsx` — server component. `await auth.protect()`, then the
  same onboarding gate `cs-comp` uses: fetch `/api/me`, and redirect to
  `/select-team?next=/scunts` if the profile has no team/name/major.
- `app/(app)/scunts/_components/ScuntsView.tsx` — client component holding the gallery
  and the upload control.
- `lib/scunts.ts` — the `ScuntsSubmission` type and the three API calls.
- `lib/nav.ts` — a Scunts entry **without** `public: true`, so it hides for signed-out
  visitors exactly like CS comp and Leaderboard.
- `eslint.config.mjs` — add `src/app/(app)/scunts/**` to the `protected` list so the
  Clerk lint rule enforces the gate.
- New dependency: `browser-image-compression`.

### Upload flow (client)

1. `<input type="file" accept="image/*,video/*">` — opens the camera or gallery on a
   phone with no extra code.
2. If the file is an image, compress it with `browser-image-compression` to ~1600 px
   and JPEG output. This also solves iPhone **HEIC**, which non-Safari browsers cannot
   display. Videos are uploaded untouched — in-browser transcoding needs ffmpeg.wasm,
   which is ~30 MB and unreliable on phones.
3. If the file is a video, reject over 100 MB or over 60 s (duration read from a
   `<video>` element's metadata) before uploading anything.
4. `POST /api/scunts/upload-url` → `PUT` the file to the returned URL → `POST
   /api/scunts/submissions` with the key and caption → refresh the list.

### Gallery

A responsive grid. Images render as `<img loading="lazy">`; videos as `<video controls
playsinline preload="metadata">` — `playsinline` so iOS does not force fullscreen, and
`preload="metadata"` so opening the page does not pull down every video. Each tile
shows the team, the caption, and the submitter's name. Execs additionally see a delete
control.

## Configuration

New environment variables on the **`api`** service, added to `backend/.env.example`
and to `DEPLOYMENT.md`:

| Variable | Purpose |
|----------|---------|
| `R2_ACCOUNT_ID` | Cloudflare account, forms the endpoint host |
| `R2_ACCESS_KEY_ID` | R2 API token |
| `R2_SECRET_ACCESS_KEY` | R2 API token |
| `R2_BUCKET` | bucket name |

All read in `internal/config`. The bucket stays **private** — it is only ever reached
through presigned URLs.

New Go dependencies: `aws-sdk-go-v2/config`, `credentials`, `service/s3`.

## Error handling

- Disallowed type or over-limit size → 400 with a plain message, surfaced inline by
  the upload control.
- Caller without a team → 409; the page's onboarding gate normally prevents this, so
  it is a backstop rather than a flow.
- R2 unreachable or unconfigured → 503 on writes; the gallery still renders.
- A presigned upload that succeeds but whose `POST /submissions` fails leaves an
  orphaned object in R2. Accepted for v1: it costs storage and nothing else, and a
  lifecycle rule on the bucket can sweep unreferenced objects later.

## Risks

- **iPhone HEVC video.** iPhones record H.265 in `.mov`, which desktop Chrome and
  Firefox often cannot play. iOS *usually* transcodes to H.264 when a video is chosen
  through a file input, but this must be verified on a real device early. If it does
  not, the fallback for v1 is offering a download link instead of inline playback;
  server-side transcoding is a much larger build.
- **Gallery weight.** With no thumbnails, a large gallery pulls full-size images.
  Client compression keeps each around 400 KB and the grid lazy-loads, which is
  expected to be sufficient at event scale. Thumbnails are the first thing to add if
  it is not.

## Verification

No test suite exists in this repo, so verification is manual plus the standard checks:

- `go vet ./...` and `gofmt -l .` clean; `go build ./cmd/api` succeeds.
- `npm run lint`, `npm run format:check`, `npm run build` clean.
- Manual: upload a photo from a laptop; upload a photo and a video from an iPhone and
  from an Android; confirm both render in the gallery in Chrome and Safari; confirm a
  signed-out visitor cannot reach `/scunts` or the API; confirm a student cannot
  delete and an exec can; confirm an over-limit video is rejected before upload.
