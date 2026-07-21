import { beforeEach, describe, expect, it, vi } from "vitest";
import { feedKeys } from "../hooks/queryKeys";
import { fetchFeed } from "./feedApi";

const http = vi.hoisted(function () {
  return {
    apiRequest: vi.fn(),
  };
});

vi.mock("./http", function () {
  return {
    apiRequest: http.apiRequest,
  };
});

describe("fetchFeed profile kind", function () {
  beforeEach(function () {
    http.apiRequest.mockReset();
    http.apiRequest.mockResolvedValue({
      items: [],
      nextCursor: null,
      hasMore: false,
    });
  });

  it("requests the server-filtered repost profile feed", async function () {
    await fetchFeed({
      username: "Cinema Fan",
      profileFeedKind: "reposts",
      cursor: "next page",
      token: "token",
    });

    expect(http.apiRequest).toHaveBeenCalledWith(
      "/v1/feed/profiles/Cinema%20Fan/posts?limit=20&cursor=next+page&kind=reposts",
      { token: "token" }
    );
  });

  it("preserves the default mixed profile feed request", async function () {
    await fetchFeed({ username: "cinemafan" });

    expect(http.apiRequest).toHaveBeenCalledWith(
      "/v1/feed/profiles/cinemafan/posts?limit=20",
      { token: undefined }
    );
  });

  it("keeps mixed and repost-only profile pages in separate caches", function () {
    expect(feedKeys.profile("cinemafan", "all")).not.toEqual(
      feedKeys.profile("cinemafan", "reposts")
    );
  });
});
