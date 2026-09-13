import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPost, updatePost } from "./postsApi";

const http = vi.hoisted(function () {
  return { apiRequest: vi.fn() };
});

vi.mock("./http", function () {
  return { apiRequest: http.apiRequest };
});

beforeEach(function () {
  http.apiRequest.mockReset();
  http.apiRequest.mockResolvedValue({
    id: "log-1",
    type: "review",
    body: "Still wonderful.",
    watchedOn: "2026-07-01",
    watchVenue: "theater",
    isRewatch: true,
  });
});

describe("film log API metadata", function () {
  it("sends watch metadata, visibility, and retry identity when creating an entry", async function () {
    const input = {
      type: "review" as const,
      body: "Still wonderful.",
      watchedOn: "2026-07-01",
      watchVenue: "theater" as const,
      isRewatch: true,
      visibility: "private" as const,
      idempotencyKey: "14a8f10f-ac0c-42c7-9e96-1605855178ae",
    };

    const saved = await createPost(input, "token");

    expect(http.apiRequest).toHaveBeenCalledWith("/v1/feed", {
      method: "POST", token: "token", body: input,
    });
    expect(saved).toMatchObject({ watchedOn: "2026-07-01", watchVenue: "theater", isRewatch: true });
  });

  it("sends explicit cleared rating/date/venue and false rewatch values when editing", async function () {
    http.apiRequest.mockResolvedValue({ id: "log-1", type: "log", watchedOn: null, watchVenue: null, isRewatch: false });

    const saved = await updatePost({
      postId: "log/1",
      body: "",
      filmRating: null,
      watchedOn: null,
      watchVenue: null,
      isRewatch: false,
    }, "token");

    expect(http.apiRequest).toHaveBeenCalledWith("/v1/feed/posts/log%2F1", {
      method: "PATCH",
      token: "token",
      body: { body: "", filmRating: null, watchedOn: null, watchVenue: null, isRewatch: false },
    });
    expect(saved).toMatchObject({ watchedOn: null, watchVenue: null, isRewatch: false });
  });
});
