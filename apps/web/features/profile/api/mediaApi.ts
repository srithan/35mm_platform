export type MediaKind = "avatar" | "cover" | "post_media";

export interface MediaPresignRequest {
  kind: MediaKind;
  contentType: string;
  contentLength: number;
}

export interface MediaPresignResponse {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  contentType: string;
  cacheControl?: string;
  expiresInSeconds: number;
  variants: {
    thumb?: string;
    feed?: string;
    full?: string;
    sm?: string;
    lg?: string;
    default?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function presignProfileMediaUpload(
  input: MediaPresignRequest,
  token: string | null
): Promise<MediaPresignResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API_URL + "/v1/media/presign", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    let message = "Failed to generate upload URL";
    try {
      const payload = await res.json();
      if (payload && typeof payload.message === "string") message = payload.message;
    } catch (_err) {
      message = res.statusText || message;
    }
    throw new Error(message);
  }

  return (await res.json()) as MediaPresignResponse;
}

export async function uploadToPresignedUrl(params: {
  uploadUrl: string;
  contentType: string;
  blob: Blob;
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void;
}): Promise<void> {
  if (!params.onProgress) {
    const res = await fetch(params.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": params.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: params.blob,
    });

    if (!res.ok) {
      let message = "Upload failed";
      try {
        const body = await res.text();
        if (body) message = body;
      } catch (_err) {
        message = res.statusText || message;
      }
      throw new Error(message);
    }
    return;
  }

  await new Promise<void>(function (resolve, reject) {
    const request = new XMLHttpRequest();
    const total = params.blob.size;

    request.open("PUT", params.uploadUrl);
    request.setRequestHeader("Content-Type", params.contentType);
    request.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable");
    params.onProgress?.({ loaded: 0, total, percent: 0 });

    request.upload.onprogress = function (event) {
      const eventTotal = event.lengthComputable && event.total > 0 ? event.total : total;
      const percent = eventTotal > 0 ? Math.min(99, Math.round((event.loaded / eventTotal) * 100)) : 0;
      params.onProgress?.({ loaded: event.loaded, total: eventTotal, percent });
    };
    request.onerror = function () {
      reject(new Error("Upload failed. Check your connection and try again."));
    };
    request.onabort = function () {
      reject(new Error("Upload cancelled"));
    };
    request.onload = function () {
      if (request.status >= 200 && request.status < 300) {
        params.onProgress?.({ loaded: total, total, percent: 100 });
        resolve();
        return;
      }
      reject(new Error(request.responseText || request.statusText || "Upload failed"));
    };
    request.send(params.blob);
  });
}
