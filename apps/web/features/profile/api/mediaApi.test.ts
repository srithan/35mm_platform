import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadToPresignedUrl } from "./mediaApi";

afterEach(function () {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("uploadToPresignedUrl", function () {
  it("uses fetch when upload progress is not requested", async function () {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const blob = new Blob(["image"], { type: "image/jpeg" });

    await uploadToPresignedUrl({
      uploadUrl: "https://upload.example.com/image",
      contentType: "image/jpeg",
      blob,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://upload.example.com/image",
      expect.objectContaining({ method: "PUT", body: blob })
    );
  });

  it("reports byte progress through XMLHttpRequest", async function () {
    const progress = vi.fn();

    class XMLHttpRequestMock {
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null };
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      onload: (() => void) | null = null;
      status = 200;
      responseText = "";
      statusText = "OK";

      open = vi.fn();
      setRequestHeader = vi.fn();
      send = vi.fn(() => {
        this.upload.onprogress?.({
          lengthComputable: true,
          loaded: 5,
          total: 10,
        } as ProgressEvent);
        this.onload?.();
      });
    }

    vi.stubGlobal("XMLHttpRequest", XMLHttpRequestMock);
    const blob = new Blob(["0123456789"], { type: "video/mp4" });

    await uploadToPresignedUrl({
      uploadUrl: "https://upload.example.com/video",
      contentType: "video/mp4",
      blob,
      onProgress: progress,
    });

    expect(progress).toHaveBeenNthCalledWith(1, { loaded: 0, total: 10, percent: 0 });
    expect(progress).toHaveBeenNthCalledWith(2, { loaded: 5, total: 10, percent: 50 });
    expect(progress).toHaveBeenLastCalledWith({ loaded: 10, total: 10, percent: 100 });
  });
});
