import type {
  UploadedFilm,
  UploadedFilmPage,
  VideoAssetStatus,
  VideoPlaybackResult,
  VideoUploadCredentials,
} from "@35mm/types";
import type { PublishFilmInput } from "@35mm/validators";
import { ApiRequestError, apiRequest } from "@/features/feed/api/http";

const requests = new WeakMap<File, Map<string, string>>();
const completed = new Set<string>();
const STORAGE_KEY = "35mm-video-upload-sessions";
type SavedSession = {
  identity: string;
  key: string;
  createdAt: number;
  completed?: boolean;
};
function savedSessions(): SavedSession[] {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(raw)
      ? raw
          .filter(
            (v): v is SavedSession =>
              typeof v?.identity === "string" &&
              typeof v?.key === "string" &&
              typeof v?.createdAt === "number" &&
              v.createdAt > Date.now() - 86400000,
          )
          .slice(-20)
      : [];
  } catch (error) {
    console.warn(
      "[video.upload] session recovery unavailable",
      error instanceof Error ? error.name : "Unknown error",
    );
    return [];
  }
}
function saveSessions(sessions: SavedSession[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-20)));
  } catch (error) {
    console.warn(
      "[video.upload] session recovery unavailable",
      error instanceof Error ? error.name : "Unknown error",
    );
  }
}

function requestKey(file: File, purpose: string, ownerId: string) {
  let keys = requests.get(file);
  if (!keys) {
    keys = new Map();
    requests.set(file, keys);
  }
  const scope = `${ownerId}:${purpose}`;
  let key = keys.get(scope);
  if (!key) {
    const identity = JSON.stringify([
      scope,
      file.name,
      file.size,
      file.lastModified,
    ]);
    const saved = savedSessions();
    const existing = saved.find((v) => v.identity === identity);
    key = existing?.key ?? crypto.randomUUID();
    if (existing?.completed) completed.add(key);
    if (!existing)
      saveSessions([...saved, { identity, key, createdAt: Date.now() }]);
    keys.set(scope, key);
  }
  return key;
}
export function forgetVideoUpload(file: File) {
  const keys = new Set(requests.get(file)?.values() ?? []);
  saveSessions(savedSessions().filter((v) => !keys.has(v.key)));
  for (const key of keys) completed.delete(key);
  requests.delete(file);
}
function waitForProcessing(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

// These endpoints are idempotent. Recover transient failures without requiring publication.
async function processingRequest<T>(
  path: string,
  getToken: () => Promise<string | null>,
  signal: AbortSignal | undefined,
  deadline: number,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    if (Date.now() >= deadline) throw new Error(
      "Video is still processing. Retry later to check progress; your upload is saved.",
    );
    const token = await getToken();
    signal?.throwIfAborted();
    try {
      const result = await apiRequest<T>(path, { method: "POST", token });
      signal?.throwIfAborted();
      return result;
    } catch (error) {
      const retryable = error instanceof ApiRequestError &&
        (error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500);
      if (!retryable || attempt >= 4 || signal?.aborted) throw error;
      console.warn("[video.upload] processing request will retry", {
        path, status: error.status, attempt: attempt + 1,
      });
      await waitForProcessing(Math.max(0, Math.min(15_000 * 2 ** attempt, 60_000, deadline - Date.now())), signal);
    }
  }
}

export async function uploadVideo(input: {
  file: File;
  purpose: "post" | "film";
  ownerId: string;
  getToken: () => Promise<string | null>;
  signal?: AbortSignal;
  onProgress: (percent: number) => void;
  onProcessing?: () => void;
}): Promise<VideoAssetStatus> {
  const { file, signal } = input;
  signal?.throwIfAborted();
  const max =
    input.purpose === "post" ? 120 * 1024 * 1024 : 20 * 1024 * 1024 * 1024;
  if (file.size <= 0 || file.size > max)
    throw new Error(
      input.purpose === "post"
        ? "Post videos must be 120 MB or smaller."
        : "Films must be 20 GB or smaller.",
    );
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const contentType =
    file.type ||
    (
      {
        mp4: "video/mp4",
        mov: "video/quicktime",
        webm: "video/webm",
        mkv: "video/x-matroska",
      } as Record<string, string>
    )[extension ?? ""];
  if (
    ![
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
    ].includes(contentType)
  )
    throw new Error("Choose an MP4, MOV, WebM or MKV video.");
  const token = await input.getToken();
  if (!token) throw new Error("Sign in to upload a video.");
  const key = requestKey(file, input.purpose, input.ownerId);
  const session = await apiRequest<VideoUploadCredentials | VideoAssetStatus>(
    "/v1/videos/uploads",
    {
      method: "POST",
      token,
      body: {
        idempotencyKey: key,
        purpose: input.purpose,
        filename: file.name,
        contentType,
        contentLength: file.size,
      },
    },
  );
  if (session.state === "ready") return session;
  let processingDeadline = Date.now() + 60 * 60 * 1000;
  if (session.state !== "processing") {
    if (!("signature" in session))
      throw new Error("Upload session unavailable. Select the file again.");
    signal?.throwIfAborted();
    if (!completed.has(key)) {
      const { Upload } = await import("tus-js-client");
      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: session.endpoint,
          chunkSize: 8 * 1024 * 1024,
          retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: session.signature,
            AuthorizationExpire: String(session.expires),
            LibraryId: session.libraryId,
            VideoId: session.videoId,
          },
          metadata: { filetype: contentType, title: `35mm:${session.id}` },
          fingerprint: async () => `35mm:${input.ownerId}:${session.id}`,
          removeFingerprintOnSuccess: true,
          onProgress: (sent, total) =>
            input.onProgress(Math.min(99, Math.round((sent / total) * 100))),
          onError: () => {
            cleanup();
            reject(new Error("Video upload failed. Retry to resume."));
          },
          onSuccess: () => {
            cleanup();
            input.onProgress(100);
            resolve();
          },
        });
        const abort = () => {
          void upload
            .abort()
            .catch((error) =>
              console.error("[video.upload] cancel failed", error),
            );
          cleanup();
          reject(new DOMException("Upload cancelled", "AbortError"));
        };
        const cleanup = () => signal?.removeEventListener("abort", abort);
        signal?.addEventListener("abort", abort, { once: true });
        if (signal?.aborted) {
          abort();
          return;
        }
        void upload
          .findPreviousUploads()
          .then((previous) => {
            if (signal?.aborted) return;
            if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
            upload.start();
          })
          .catch((error) => {
            cleanup();
            reject(error);
          });
      });
      completed.add(key);
      saveSessions(
        savedSessions().map((v) =>
          v.key === key ? { ...v, completed: true } : v,
        ),
      );
    }
    processingDeadline = Date.now() + 60 * 60 * 1000;
    input.onProcessing?.();
    const acknowledged = await processingRequest<VideoAssetStatus>(
      `/v1/videos/${session.id}/complete`, input.getToken, signal, processingDeadline,
    );
    if (acknowledged.state === "failed")
      throw new Error(acknowledged.failureReason ?? "Video processing failed.");
    if (input.purpose === "post") return acknowledged;
  } else {
    input.onProcessing?.();
    if (input.purpose === "post") return session;
  }
  // Films require readiness before publication. Posts continue through the durable worker.
  // A bounded wait keeps pending uploads recoverable by retry without blocking publication forever.
  for (let attempt = 0; attempt < 240; attempt++) {
    signal?.throwIfAborted();
    const status = await processingRequest<VideoAssetStatus>(
      `/v1/videos/${session.id}/refresh`, input.getToken, signal, processingDeadline,
    );
    if (status.state === "ready") return status;
    if (status.state === "failed")
      throw new Error(status.failureReason ?? "Video processing failed.");
    await waitForProcessing(Math.max(0, Math.min(15000, processingDeadline - Date.now())), signal);
  }
  throw new Error(
    "Video is still processing. Retry later to check progress; your upload is saved.",
  );
}
export const getVideoPlayback = (id: string, token: string | null) =>
  apiRequest<VideoPlaybackResult>(`/v1/videos/${id}/playback`, { token });
export const publishFilm = (
  id: string,
  body: PublishFilmInput,
  token: string | null,
) =>
  apiRequest<{ filmId: string }>(`/v1/videos/${id}/publish`, {
    method: "POST",
    body,
    token,
  });
export const getUploadedFilm = (id: string, token: string | null) =>
  apiRequest<UploadedFilm>(`/v1/videos/films/${id}`, { token });
export const getUploadedFilms = (
  cursor: string | null,
  mine: boolean,
  token: string | null,
) => {
  const query = new URLSearchParams({ limit: "20", mine: String(mine) });
  if (cursor) query.set("cursor", cursor);
  return apiRequest<UploadedFilmPage>(`/v1/videos/films?${query}`, { token });
};
export const deleteVideo = (id: string, token: string | null) =>
  apiRequest<{ ok: true }>(`/v1/videos/${id}`, { method: "DELETE", token });
