import imageCompression from "browser-image-compression";
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
  // The mission this is proof for; absent on uploads from before proof was
  // tied to missions.
  taskId?: string;
  // Absent reads as accepted: older uploads were always public.
  status?: "pending" | "accepted";
  points?: number;
}

// Kept in step with the same constants in internal/scunts/scunts.go. The
// server re-checks everything here against the object it actually stored;
// these exist to fail a doomed upload before megabytes are transferred.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Videos are normally compressed well under this (see compressVideo); the
// cap is sized for the fallback, where a browser that can't compress sends
// the phone's original.
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
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
  taskId: string,
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
    { key: signed.key, taskId, caption },
    authHeader(token),
  );
  return data;
}

export async function acceptSubmission(
  token: string | null,
  id: string,
): Promise<void> {
  await api.post(
    `/api/scunts/submissions/${id}/accept`,
    null,
    authHeader(token),
  );
}

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

// prepareProof gets a picked file ready to upload: photos are shrunk,
// videos are length-checked and compressed. onProgress reports video
// compression from 0 to 1. Throws an Error with a message fit to show the
// user.
export async function prepareProof(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<File> {
  if (!file.type.startsWith("video/")) {
    return imageCompression(file, IMAGE_OPTIONS);
  }
  // Length is checked here rather than server-side: reading duration from a
  // container needs a parser the backend has no other use for. Unreadable
  // metadata isn't fatal — the size cap still bounds it.
  let seconds = 0;
  try {
    seconds = await videoDuration(file);
  } catch {}
  if (seconds > MAX_VIDEO_SECONDS) {
    throw new Error("Videos must be 60 seconds or shorter.");
  }

  const smaller = await compressVideo(file, onProgress);
  const toSend = smaller && smaller.size < file.size ? smaller : file;
  if (toSend.size > MAX_VIDEO_BYTES) {
    throw new Error(
      "That video is too large to upload. Record a shorter clip, or lower your camera quality.",
    );
  }
  return toSend;
}

// Target for compressed video: 720p on the short side at 2.5 Mbps, which
// puts a 60-second clip around 20 MB. Plenty to judge whether a mission was
// done, and far quicker to upload on campus data than a phone's original.
const VIDEO_SHORT_SIDE = 720;
const VIDEO_BITRATE = 2_500_000;

// compressVideo re-encodes a video to VIDEO_SHORT_SIDE / VIDEO_BITRATE using
// the browser's hardware encoder (WebCodecs, via Mediabunny). Resolves null
// when this browser can't do it — no WebCodecs, an unsupported codec, or a
// failure mid-way — so the caller falls back to uploading the original.
async function compressVideo(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<File | null> {
  if (typeof VideoEncoder === "undefined") return null;
  try {
    // Loaded on demand so the library only downloads when someone actually
    // picks a video, not on every visit to the page.
    const {
      ALL_FORMATS,
      BlobSource,
      BufferTarget,
      Conversion,
      Input,
      Mp4OutputFormat,
      Output,
      Quality,
    } = await import("mediabunny");

    const input = new Input({
      formats: ALL_FORMATS,
      source: new BlobSource(file),
    });
    const target = new BufferTarget();
    const output = new Output({
      // In-memory fast start puts the index at the front of the file, so
      // the gallery can start playing before the whole clip downloads.
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });

    const conversion = await Conversion.init({
      input,
      output,
      video: (track) => {
        // Scale by the short side so portrait and landscape both land at
        // 720p, and never upscale a clip that's already smaller.
        const w = track.displayWidth;
        const h = track.displayHeight;
        const resize =
          Math.min(w, h) > VIDEO_SHORT_SIDE
            ? h > w
              ? { width: VIDEO_SHORT_SIDE }
              : { height: VIDEO_SHORT_SIDE }
            : {};
        return {
          ...resize,
          codec: "avc",
          quality: new Quality({ bitrate: VIDEO_BITRATE }),
          forceTranscode: true,
        };
      },
      // Audio is left as-is: phone audio is already small, and copying it
      // avoids needing an audio encoder, which older iPhones lack.
      showWarnings: false,
    });

    // A dropped audio track would silently mute the proof (a story told to
    // a stranger, say), so any discarded track means "send the original".
    if (!conversion.isValid || conversion.discardedTracks.length > 0) {
      return null;
    }
    if (onProgress) conversion.onProgress = (p) => onProgress(p);
    await conversion.execute();

    if (!target.buffer) return null;
    const name = file.name.replace(/\.[^.]*$/, "") + ".mp4";
    return new File([target.buffer], name, { type: "video/mp4" });
  } catch {
    return null;
  }
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
  // True while the caller's team has proof for it awaiting review.
  pending?: boolean;
}

// missionCodes numbers each mission within its section (G1, G2… B1…), in
// the order the list shows them.
export function missionCodes(
  tasks: ScuntsTask[],
  sections: ScuntsSection[],
): Map<string, string> {
  const codes = new Map<string, string>();
  for (const sec of sections) {
    tasks
      .filter((t) => t.category === sec.key)
      .forEach((t, i) => codes.set(t.id, `${sec.prefix}${i + 1}`));
  }
  return codes;
}

export async function listTasks(token: string | null): Promise<ScuntsTask[]> {
  const res = await api.get<ScuntsTask[]>(
    "/api/scunts/tasks",
    authHeader(token),
  );
  return res.data;
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
