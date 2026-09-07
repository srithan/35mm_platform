import { parseFeedPage, parseVideoPlayback, parseVideoUploadSession } from "@/features/videos/contracts";

const VIDEO_STATUS = {
  id: "video-1",
  state: "uploading",
  failureReason: null,
  durationSeconds: null,
  width: null,
  height: null,
  filmId: null,
  postId: null,
};

describe("mobile video API contracts", () => {
  it("accepts signed Bunny upload credentials", () => {
    expect(parseVideoUploadSession({
      ...VIDEO_STATUS,
      endpoint: "https://video.bunnycdn.com/tusupload",
      libraryId: "123",
      videoId: "provider-video",
      expires: 4_102_444_800,
      signature: "signed-value",
    })).toMatchObject({ id: "video-1", libraryId: "123" });
  });

  it.each([
    "http://video.bunnycdn.com/tusupload",
    "https://video.bunnycdn.com.evil.example/tusupload",
    "https://evil.example/tusupload",
  ])("rejects an untrusted upload endpoint: %s", (endpoint) => {
    expect(() => parseVideoUploadSession({
      ...VIDEO_STATUS,
      endpoint,
      libraryId: "123",
      videoId: "provider-video",
      expires: 4_102_444_800,
      signature: "signed-value",
    })).toThrow("not trusted");
  });

  it("rejects insecure playback URLs", () => {
    expect(() => parseVideoPlayback({
      embedUrl: "http://iframe.mediadelivery.net/embed/123/video",
      posterUrl: "https://video.example.b-cdn.net/poster.jpg",
      expires: 4_102_444_800,
      width: 1920,
      height: 1080,
    })).toThrow("must use HTTPS");
  });

  it("rejects an HTTPS playback grant on an unexpected host", () => {
    expect(() => parseVideoPlayback({
      embedUrl: "https://iframe.mediadelivery.net.evil.example/embed/123/video",
      posterUrl: "https://video.example.b-cdn.net/poster.jpg",
      expires: 4_102_444_800,
      width: 1920,
      height: 1080,
    })).toThrow("embedUrl host is not trusted");
  });

  it("rejects feed interaction state with the wrong runtime shape", () => {
    expect(() => parseFeedPage({
      items: [{
        id: "post-1",
        type: "image",
        author: { id: "user-1", username: "director", displayName: "Director" },
        body: "A clip",
        media: [{ type: "video", url: "/v1/videos/video-1/playback", videoAssetId: "video-1" }],
        createdAt: "2026-09-06T12:00:00.000Z",
        updatedAt: "2026-09-06T12:00:00.000Z",
        likeCount: 0,
        commentCount: 0,
        repostCount: 0,
        bookmarkCount: 0,
        isLiked: "false",
        isReposted: false,
        isBookmarked: false,
        quotedPostUnavailable: false,
      }],
      nextCursor: null,
      hasMore: false,
    })).toThrow("FeedPost.isLiked must be a boolean");
  });
});
