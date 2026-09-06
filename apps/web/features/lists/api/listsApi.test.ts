import { beforeEach, describe, expect, it, vi } from "vitest";
import { listKeys } from "../hooks/queryKeys";
import { fetchPublicLists } from "./listsApi";

const http = vi.hoisted(function () {
  return { apiRequest: vi.fn() };
});

vi.mock("@/features/feed/api/http", function () {
  return { apiRequest: http.apiRequest };
});

describe("public film lists", function () {
  beforeEach(function () {
    http.apiRequest.mockReset();
    http.apiRequest.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
  });

  it("requests a bounded cursor page with server-side sorting", async function () {
    await fetchPublicLists({ sort: "recent", cursor: "next page", token: "token" });

    expect(http.apiRequest).toHaveBeenCalledWith(
      "/v1/lists?sort=recent&limit=24&cursor=next+page",
      { token: "token" }
    );
  });

  it("sends search and filters with the next cursor", async function () {
    await fetchPublicLists({ q: "  city nights  ", format: "ranked", size: "medium", cursor: "next" });
    expect(http.apiRequest).toHaveBeenCalledWith(
      "/v1/lists?sort=popular&limit=24&q=city+nights&format=ranked&size=medium&cursor=next",
      { token: undefined }
    );
    expect(listKeys.public("popular", { q: "city" })).not.toEqual(listKeys.public("popular", { q: "night" }));
  });

  it("partitions popular and recent browse pages in the query cache", function () {
    expect(listKeys.public("popular")).not.toEqual(listKeys.public("recent"));
  });
});
