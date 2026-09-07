import type { VideoUploadCredentials } from "@35mm/types";

export const VIDEO_TUS_CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_CHUNK_ATTEMPTS = 6;

export interface TusUploadFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  slice(start?: number, end?: number, contentType?: string): Blob;
}

export interface TusUploadResult {
  readonly uploadUrl: string;
  readonly uploadedBytes: number;
}

function trustedUploadUrl(endpoint: string, location: string): string {
  const endpointUrl = new URL(endpoint);
  const resolved = new URL(location, endpointUrl);
  if (resolved.protocol !== "https:" || resolved.origin !== endpointUrl.origin) {
    throw new Error("Video provider returned an untrusted upload URL.");
  }
  return resolved.toString();
}

function uploadHeaders(credentials: VideoUploadCredentials): Record<string, string> {
  return {
    AuthorizationSignature: credentials.signature,
    AuthorizationExpire: String(credentials.expires),
    LibraryId: credentials.libraryId,
    VideoId: credentials.videoId,
    "Tus-Resumable": "1.0.0",
  };
}

function base64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return globalThis.btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

function metadata(credentials: VideoUploadCredentials, file: TusUploadFile): string {
  return [
    `filename ${base64(file.name)}`,
    `filetype ${base64(file.type)}`,
    `title ${base64(`35mm:${credentials.id}`)}`,
  ].join(",");
}

function parseOffset(response: Response): number {
  const offset = Number(response.headers.get("upload-offset"));
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error("Video provider returned an invalid upload offset.");
  }
  return offset;
}

async function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener("abort", abort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

async function readOffset(
  fetchImpl: typeof globalThis.fetch,
  uploadUrl: string,
  credentials: VideoUploadCredentials,
  signal?: AbortSignal,
): Promise<number> {
  const response = await fetchImpl(uploadUrl, {
    method: "HEAD",
    headers: uploadHeaders(credentials),
    redirect: "error",
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Video upload resume failed (${response.status}).`);
  return parseOffset(response);
}

async function createUpload(
  fetchImpl: typeof globalThis.fetch,
  file: TusUploadFile,
  credentials: VideoUploadCredentials,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetchImpl(credentials.endpoint, {
    method: "POST",
    headers: {
      ...uploadHeaders(credentials),
      "Upload-Length": String(file.size),
      "Upload-Metadata": metadata(credentials, file),
    },
    redirect: "error",
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Video upload could not start (${response.status}).`);
  const location = response.headers.get("location");
  if (!location) throw new Error("Video provider did not return an upload URL.");
  return trustedUploadUrl(credentials.endpoint, location);
}

export async function uploadTusFile(input: {
  readonly file: TusUploadFile;
  readonly credentials: VideoUploadCredentials;
  readonly fetchImpl?: typeof globalThis.fetch;
  readonly previousUploadUrl?: string | null;
  readonly signal?: AbortSignal;
  readonly onProgress: (percent: number) => void;
  readonly onUploadUrl?: (url: string) => Promise<void> | void;
}): Promise<TusUploadResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  input.signal?.throwIfAborted();
  if (input.credentials.expires * 1_000 <= Date.now() + 60_000) {
    throw new Error("Video upload session expired. Select the video again.");
  }

  let uploadUrl: string;
  let offset = 0;
  if (input.previousUploadUrl) {
    uploadUrl = trustedUploadUrl(input.credentials.endpoint, input.previousUploadUrl);
    try {
      offset = await readOffset(fetchImpl, uploadUrl, input.credentials, input.signal);
    } catch {
      input.signal?.throwIfAborted();
      uploadUrl = await createUpload(fetchImpl, input.file, input.credentials, input.signal);
      await input.onUploadUrl?.(uploadUrl);
    }
  } else {
    uploadUrl = await createUpload(fetchImpl, input.file, input.credentials, input.signal);
    await input.onUploadUrl?.(uploadUrl);
  }

  if (offset > input.file.size) throw new Error("Video provider upload offset exceeds file size.");
  input.onProgress(Math.round((offset / input.file.size) * 100));

  while (offset < input.file.size) {
    input.signal?.throwIfAborted();
    const end = Math.min(offset + VIDEO_TUS_CHUNK_BYTES, input.file.size);
    let completed = false;
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CHUNK_ATTEMPTS && !completed; attempt += 1) {
      try {
        const chunk = input.file.slice(offset, end, "application/offset+octet-stream");
        const response = await fetchImpl(uploadUrl, {
          method: "PATCH",
          headers: {
            ...uploadHeaders(input.credentials),
            "Content-Type": "application/offset+octet-stream",
            "Upload-Offset": String(offset),
          },
          body: chunk,
          redirect: "error",
          ...(input.signal ? { signal: input.signal } : {}),
        });
        if (!response.ok) throw new Error(`Video chunk upload failed (${response.status}).`);
        const nextOffset = parseOffset(response);
        if (nextOffset <= offset || nextOffset > end) {
          throw new Error("Video provider returned a non-progressing upload offset.");
        }
        offset = nextOffset;
        completed = true;
      } catch (error) {
        lastError = error;
        input.signal?.throwIfAborted();
        if (attempt + 1 >= MAX_CHUNK_ATTEMPTS) break;
        await sleep(Math.min(1_000 * 2 ** attempt, 20_000), input.signal);
        try {
          const providerOffset = await readOffset(
            fetchImpl,
            uploadUrl,
            input.credentials,
            input.signal,
          );
          if (providerOffset > input.file.size) {
            throw new Error("Video provider upload offset exceeds file size.");
          }
          offset = providerOffset;
          completed = offset >= end;
        } catch (resumeError) {
          input.signal?.throwIfAborted();
          lastError = resumeError;
        }
      }
    }
    if (!completed) {
      throw lastError instanceof Error
        ? lastError
        : new Error("Video upload failed. Retry to resume.");
    }
    input.onProgress(Math.min(100, Math.round((offset / input.file.size) * 100)));
  }
  return { uploadUrl, uploadedBytes: offset };
}
