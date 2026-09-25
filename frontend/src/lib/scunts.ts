import api from "@/lib/api";

// Mirrors internal/scunts.Submission. photoUrl is a presigned R2 link the
// server mints per response — it expires, so it is never cached anywhere
// and a stale gallery is refetched rather than repaired.
export interface ScuntsSubmission {
  id: string;
  team: string;
  kind: "image" | "video";
  contentType: string;
  size: number;
  caption: string;
  submittedByName: string;
  submittedAt: string;
  photoUrl: string;
}

// Kept in step with the same constants in internal/scunts/scunts.go. The
// server re-checks everything here against the object it actually stored;
// these exist to fail a doomed upload before megabytes are transferred.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const MAX_CAPTION_LEN = 200;

// What the file picker accepts. HEIC is absent on purpose: iPhones offer
// it, but only Safari can display it, so images are converted to JPEG in
// the browser before upload.
export const ACCEPTED_TYPES =
  "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

function authHeader(token: string | null) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export async function listSubmissions(
  token: string | null,
): Promise<ScuntsSubmission[]> {
  const res = await api.get<ScuntsSubmission[]>(
    "/api/scunts/submissions",
    authHeader(token),
  );
  return res.data;
}

export async function deleteSubmission(
  token: string | null,
  id: string,
): Promise<void> {
  await api.delete(`/api/scunts/submissions/${id}`, authHeader(token));
}

// upload runs the three-step handshake: ask for a signed URL, PUT the file
// straight to R2, then tell the backend which object to record. The middle
// step deliberately bypasses our own server, so the file size is bounded by
// the storage provider rather than by the Go server's request limits.
export async function upload(
  token: string | null,
  file: File,
  caption: string,
): Promise<ScuntsSubmission> {
  const { data: signed } = await api.post<{ uploadUrl: string; key: string }>(
    "/api/scunts/upload-url",
    { contentType: file.type, size: file.size },
    authHeader(token),
  );

  const put = await fetch(signed.uploadUrl, {
    method: "PUT",
    // Must match the content type signed into the URL, or R2 rejects the
    // signature.
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error("upload failed");
  }

  const { data } = await api.post<ScuntsSubmission>(
    "/api/scunts/submissions",
    { key: signed.key, caption },
    authHeader(token),
  );
  return data;
}

// videoDuration resolves the length of a video file without uploading it,
// by letting the browser read just the metadata. Rejects rather than
// resolving 0 when the browser can't parse the file, so the caller can tell
// "too long" apart from "unreadable".
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    const url = URL.createObjectURL(file);
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(el.duration);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not read video"));
    };
    el.src = url;
  });
}

// --- Mission checklist -----------------------------------------------------

// Mirrors internal/scunts.Section. The list comes back in render order;
// prefix is the letter(s) each mission's number carries (G1, B22).
export interface ScuntsSection {
  key: string;
  label: string;
  prefix: string;
  order: number;
}

export type ScuntsCategory = string;

export async function listSections(
  token: string | null,
): Promise<ScuntsSection[]> {
  const res = await api.get<ScuntsSection[]>(
    "/api/scunts/sections",
    authHeader(token),
  );
  return res.data;
}

export async function createSection(
  token: string | null,
  label: string,
  prefix: string,
): Promise<ScuntsSection> {
  const res = await api.post<ScuntsSection>(
    "/api/scunts/sections",
    { label, prefix },
    authHeader(token),
  );
  return res.data;
}

// Mirrors internal/scunts.TaskView. `done` is resolved per request against
// the caller's team, so two students on different teams see different
// values for the same mission.
export interface ScuntsTask {
  id: string;
  category: ScuntsCategory;
  text: string;
  note?: string;
  points: number;
  order: number;
  done: boolean;
  doneByName?: string;
  doneAt?: string;
}

export async function listTasks(token: string | null): Promise<ScuntsTask[]> {
  const res = await api.get<ScuntsTask[]>(
    "/api/scunts/tasks",
    authHeader(token),
  );
  return res.data;
}

// Ticking is server-side rather than local state, which is the whole point:
// a teammate on another phone sees it on their next load.
export async function setTaskDone(
  token: string | null,
  id: string,
  done: boolean,
): Promise<void> {
  const url = `/api/scunts/tasks/${id}/done`;
  if (done) {
    await api.put(url, null, authHeader(token));
  } else {
    await api.delete(url, authHeader(token));
  }
}

// Mirrors scunts.DefaultTaskPoints. Sent explicitly rather than relying on
// the server default, so the value shown in the form is the value stored.
export const DEFAULT_TASK_POINTS = 100;

export async function createTask(
  token: string | null,
  category: ScuntsCategory,
  text: string,
  note: string,
  points: number,
): Promise<ScuntsTask> {
  const res = await api.post<ScuntsTask>(
    "/api/scunts/tasks",
    { category, text, note, points },
    authHeader(token),
  );
  return res.data;
}

// Points must be sent on every edit: the server falls back to the default
// when the field is absent, so omitting it would quietly reset a mission
// worth 250 back to 100 the next time someone fixed a typo.
export async function updateTask(
  token: string | null,
  id: string,
  text: string,
  note: string,
  points: number,
): Promise<ScuntsTask> {
  const res = await api.patch<ScuntsTask>(
    `/api/scunts/tasks/${id}`,
    { text, note, points },
    authHeader(token),
  );
  return res.data;
}

export async function deleteTask(
  token: string | null,
  id: string,
): Promise<void> {
  await api.delete(`/api/scunts/tasks/${id}`, authHeader(token));
}
