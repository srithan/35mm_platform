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
  expiresInSeconds: number;
  variants: {
    thumb: string;
    feed: string;
    full: string;
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
}): Promise<void> {
  const res = await fetch(params.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.contentType,
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
}
