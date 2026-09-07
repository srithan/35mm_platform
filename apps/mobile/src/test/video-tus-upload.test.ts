import type { VideoUploadCredentials } from "@35mm/types";

import { uploadTusFile, VIDEO_TUS_CHUNK_BYTES } from "@/features/videos/tusUpload";

const CREDENTIALS: VideoUploadCredentials = {
  id: "video-1",
  state: "uploading",
  failureReason: null,
  durationSeconds: null,
  width: null,
  height: null,
  filmId: null,
  postId: null,
  endpoint: "https://video.bunnycdn.com/tusupload",
  libraryId: "123",
  videoId: "provider-video",
  expires: 4_102_444_800,
  signature: "signed-value",
};

describe("bounded mobile TUS uploads", () => {
  it("streams fixed-size chunks and reports completion", async () => {
    const size = VIDEO_TUS_CHUNK_BYTES + 3;
    const progress: number[] = [];
    const chunkSizes: number[] = [];
    let offset = 0;
    const fetchImpl = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(null, {
          status: 201,
          headers: { location: "/tusupload/session-1" },
        });
      }
      if (init?.method === "PATCH") {
        const body = init.body as Blob;
        chunkSizes.push(body.size);
        offset += body.size;
        return new Response(null, { status: 204, headers: { "upload-offset": String(offset) } });
      }
      throw new Error("Unexpected request");
    });

    const result = await uploadTusFile({
      credentials: CREDENTIALS,
      fetchImpl,
      file: {
        name: "scene.mp4",
        size,
        type: "video/mp4",
        slice: (start = 0, end = size, type) => new Blob(
          [new Uint8Array(end - start)],
          type ? { type } : {},
        ),
      },
      onProgress: (value) => progress.push(value),
    });

    expect(chunkSizes).toEqual([VIDEO_TUS_CHUNK_BYTES, 3]);
    expect(progress).toEqual([0, 100, 100]);
    expect(result).toEqual({
      uploadUrl: "https://video.bunnycdn.com/tusupload/session-1",
      uploadedBytes: size,
    });
  });

  it("resumes from the provider offset without retransmitting prior bytes", async () => {
    const size = VIDEO_TUS_CHUNK_BYTES + 4;
    const offsets: string[] = [];
    const fetchImpl = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "HEAD") {
        return new Response(null, {
          status: 204,
          headers: { "upload-offset": String(VIDEO_TUS_CHUNK_BYTES) },
        });
      }
      if (init?.method === "PATCH") {
        const headers = new Headers(init.headers);
        offsets.push(headers.get("upload-offset") ?? "");
        return new Response(null, { status: 204, headers: { "upload-offset": String(size) } });
      }
      throw new Error("Unexpected request");
    });

    await uploadTusFile({
      credentials: CREDENTIALS,
      fetchImpl,
      previousUploadUrl: "https://video.bunnycdn.com/tusupload/session-1",
      file: {
        name: "scene.mp4",
        size,
        type: "video/mp4",
        slice: (start = 0, end = size, type) => new Blob(
          [new Uint8Array(end - start)],
          type ? { type } : {},
        ),
      },
      onProgress: () => undefined,
    });

    expect(offsets).toEqual([String(VIDEO_TUS_CHUNK_BYTES)]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
