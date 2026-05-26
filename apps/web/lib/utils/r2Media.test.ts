import { afterEach, describe, expect, it, vi } from "vitest";
import { resolvePublicMediaUrl, shouldResolvePublicR2Url } from "./r2Media";

describe("r2Media", function () {
  afterEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_MEDIA_READS_PUBLIC;
  });

  it("shouldResolvePublicR2Url handles r2.dev and cloudflarestorage hosts", function () {
    process.env.NEXT_PUBLIC_MEDIA_READS_PUBLIC = "false";
    expect(shouldResolvePublicR2Url("https://pub-123.r2.dev/users/a.jpg")).toBe(true);
    expect(
      shouldResolvePublicR2Url("https://pub-123.r2.dev/users/a.jpg?X-Amz-Signature=already-signed")
    ).toBe(false);
    expect(
      shouldResolvePublicR2Url("https://acct.r2.cloudflarestorage.com/users/a.jpg")
    ).toBe(true);
    expect(
      shouldResolvePublicR2Url(
        "https://acct.r2.cloudflarestorage.com/users/a.jpg?X-Amz-Signature=already-signed"
      )
    ).toBe(true);
    expect(shouldResolvePublicR2Url("https://example.com/image.jpg")).toBe(false);
  });

  it("skips resolve-url when media reads are already public", function () {
    process.env.NEXT_PUBLIC_MEDIA_READS_PUBLIC = "true";
    expect(shouldResolvePublicR2Url("https://pub-123.r2.dev/users/a.jpg")).toBe(false);
  });

  it("cache key uses pathname, not query string", async function () {
    process.env.NEXT_PUBLIC_MEDIA_READS_PUBLIC = "false";
    const fetchMock = vi.fn(async function () {
      return new Response(
        JSON.stringify({
          url: "https://pub-123.r2.dev/users/a.jpg?X-Amz-Signature=signed",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = await resolvePublicMediaUrl("https://pub-123.r2.dev/users/a.jpg");
    const second = await resolvePublicMediaUrl("https://pub-123.r2.dev/users/a.jpg?v=2");

    expect(first).toBe("https://pub-123.r2.dev/users/a.jpg?X-Amz-Signature=signed");
    expect(second).toBe("https://pub-123.r2.dev/users/a.jpg?X-Amz-Signature=signed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("force:true bypasses cache and refetches", async function () {
    process.env.NEXT_PUBLIC_MEDIA_READS_PUBLIC = "false";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: "https://pub-123.r2.dev/users/force.jpg?X-Amz-Signature=first",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            url: "https://pub-123.r2.dev/users/force.jpg?X-Amz-Signature=second",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const first = await resolvePublicMediaUrl("https://pub-123.r2.dev/users/force.jpg");
    const second = await resolvePublicMediaUrl("https://pub-123.r2.dev/users/force.jpg", { force: true });

    expect(first).toBe("https://pub-123.r2.dev/users/force.jpg?X-Amz-Signature=first");
    expect(second).toBe("https://pub-123.r2.dev/users/force.jpg?X-Amz-Signature=second");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
