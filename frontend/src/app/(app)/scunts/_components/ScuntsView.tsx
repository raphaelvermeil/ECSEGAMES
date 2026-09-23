"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import imageCompression from "browser-image-compression";
import MobilePageBanner from "@/components/MobilePageBanner";
import { Camera, Trash } from "@/components/icons";
import { teamLabel, type Team } from "@/lib/scores";
import {
  ACCEPTED_TYPES,
  MAX_CAPTION_LEN,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  deleteSubmission,
  listSubmissions,
  upload,
  videoDuration,
  type ScuntsSubmission,
} from "@/lib/scunts";

// Compression target for photos. 1600px on the long edge is still sharp on
// a laptop, and it takes an 8 MB phone original down to a few hundred KB —
// which matters both for campus upload speeds and for a gallery that loads
// every tile. Converting to JPEG also sidesteps iPhone HEIC, which no
// browser but Safari can display.
const IMAGE_OPTIONS = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 1,
  fileType: "image/jpeg",
  useWebWorker: true,
};

export default function ScuntsView({ canManage }: { canManage: boolean }) {
  const { getToken } = useAuth();
  const [items, setItems] = useState<ScuntsSubmission[] | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // load fetches but doesn't touch state, so the effect below can own the
  // "is this render still current?" question and the upload path can just
  // await it.
  const load = useCallback(
    async () => listSubmissions(await getToken()),
    [getToken],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await load();
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) setError("Could not load submissions.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear immediately so picking the same file twice still fires onChange.
    e.target.value = "";
    if (!file) return;

    if (!caption.trim()) {
      setError("Add a caption saying what this is proof of.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      let toSend = file;

      if (file.type.startsWith("video/")) {
        if (file.size > MAX_VIDEO_BYTES) {
          throw new Error(
            "That video is over 100 MB. Record a shorter clip, or lower your camera quality.",
          );
        }
        // Length is checked here rather than server-side: reading duration
        // from a container needs a parser the backend has no other use for.
        try {
          if ((await videoDuration(file)) > MAX_VIDEO_SECONDS) {
            throw new Error("Videos must be 60 seconds or shorter.");
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes("60 seconds"))
            throw err;
          // Unreadable metadata isn't fatal — the size cap already bounds it.
        }
      } else {
        toSend = await imageCompression(file, IMAGE_OPTIONS);
      }

      await upload(await getToken(), toSend, caption.trim());
      setCaption("");
      setItems(await load());
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "upload failed"
          ? err.message
          : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this submission for everyone?")) return;
    try {
      await deleteSubmission(await getToken(), id);
      setItems((prev) => prev?.filter((s) => s.id !== id) ?? null);
    } catch {
      setError("Could not remove that submission.");
    }
  }

  return (
    <>
      <MobilePageBanner title="Scunts" subtitle="Post your proof." />

      <main className="min-h-screen bg-sched-bg px-4 pb-16 pt-6 lg:px-10 lg:pb-11 lg:pt-9">
        <div className="hidden items-baseline justify-between lg:flex">
          <h1 className="text-4xl font-extrabold text-ecsess-50">Scunts</h1>
          <p className="text-base text-ecsess-300">
            Photo and video proof, all weekend.
          </p>
        </div>

        {/* Caption first, deliberately: it is the only thing saying what a
            photo is proof of, and asking for it after the file picker would
            mean re-opening the camera to fix a missing one. */}
        <section className="mt-6 rounded-sm border border-sched-hair bg-sched-bg-raised p-4 lg:mt-8 lg:p-5">
          <label
            htmlFor="scunts-caption"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-sched-accent"
          >
            What is this proof of?
          </label>
          <input
            id="scunts-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={MAX_CAPTION_LEN}
            placeholder="e.g. Whole team in the Leacock fountain"
            className="mt-2 w-full rounded-sm border border-sched-hair bg-sched-bg px-3 py-2.5 text-sched-cream outline-none transition-colors placeholder:text-sched-text-muted focus:border-sched-accent-dim"
          />

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={onPick}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-sm bg-sched-accent px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-sched-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Camera width={16} height={16} strokeWidth={2} />
            {busy ? "Uploading…" : "Add photo or video"}
          </button>
          <p className="mt-2 font-mono text-[11px] text-sched-text-muted">
            Photos are shrunk automatically. Videos: up to 60 seconds.
          </p>

          {error && (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="mt-8">
          {items === null ? (
            <p className="font-mono text-xs text-sched-text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="font-mono text-xs text-sched-text-muted">
              Nothing submitted yet. Be the first.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="overflow-hidden rounded-sm border border-sched-hair bg-sched-bg-raised"
                >
                  {s.kind === "video" ? (
                    // preload="metadata" so opening the page doesn't pull
                    // down every clip; playsinline so iOS plays it in the
                    // grid instead of taking over the screen.
                    <video
                      src={s.photoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-square w-full bg-black object-cover"
                    />
                  ) : (
                    // Plain <img>: these are presigned URLs on a storage
                    // host, which next/image would need configured up front
                    // and would try to re-optimise for no gain.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.photoUrl}
                      alt={s.caption}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  )}

                  <div className="p-3">
                    <p className="text-sm leading-snug text-sched-cream">
                      {s.caption}
                    </p>
                    <p className="mt-1.5 font-mono text-[11px] text-sched-text-muted">
                      {teamLabel(s.team as Team)} · {s.submittedByName}
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => onDelete(s.id)}
                        className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-red-300 transition-colors hover:text-red-200"
                      >
                        <Trash width={13} height={13} strokeWidth={2} />
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
