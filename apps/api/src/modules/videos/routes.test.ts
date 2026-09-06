import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { ApiError } from "../../lib/errors.js";
const mocks = vi.hoisted(() => ({
  rows: [] as unknown[],
  viewer: null as null | { userId: string },
  select: vi.fn(),
  update: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("../../lib/middleware.js", () => ({
  getOptionalAuthUser: async () => mocks.viewer,
  requireAuth: async (c: Context, next: Next) => {
    if (!mocks.viewer) return c.json({ code: "UNAUTHORIZED" }, 401);
    c.set("user", mocks.viewer);
    await next();
  },
}));
vi.mock("../../lib/db.js", () => ({
  getDb: () => ({ select: mocks.select, update: mocks.update }),
  getWriteDb: () => {
    throw new Error("Unexpected write");
  },
}));
vi.mock("../../lib/rateLimit.js", () => ({
  createRateLimitMiddleware: () => async (_c: Context, next: Next) => {
    mocks.rate();
    await next();
  },
  identifyByUserId: () => "user",
  identifyByIp: () => "ip",
}));
vi.mock("../../lib/env.js", () => ({
  loadEnv: () => ({
    BUNNY_STREAM_LIBRARY_ID: "123",
    BUNNY_STREAM_API_KEY: "test-api",
    BUNNY_STREAM_TOKEN_KEY: "test-token",
    BUNNY_STREAM_WEBHOOK_SECRET: "test-webhook",
    BUNNY_STREAM_CDN_HOST: "test.b-cdn.net",
  }),
}));
import { videoRoutes } from "./routes.js";
const id = "d5f5a4c6-23be-4567-8901-234567890123";
function app() {
  const instance = new Hono();
  instance.onError((e, c) =>
    c.json(
      { message: e.message },
      (e instanceof ApiError ? e.status : 500) as 400,
    ),
  );
  return instance.route("/v1/videos", videoRoutes);
}
beforeEach(() => {
  mocks.rows = [];
  mocks.viewer = null;
  mocks.rate.mockClear();
  mocks.select.mockReset();
  const query = {
    from: () => query,
    innerJoin: () => query,
    where: () => query,
    limit: async () => mocks.rows,
  };
  mocks.select.mockReturnValue(query);
});
describe("video route boundaries", () => {
  it.each(["uploads", `${id}/complete`, `${id}/refresh`, `${id}/publish`])(
    "requires authentication before %s",
    async (path) => {
      expect(
        (
          await app().request(`/v1/videos/${path}`, {
            method: "POST",
            body: "{}",
          })
        ).status,
      ).toBe(401);
      expect(mocks.select).not.toHaveBeenCalled();
    },
  );
  it("rejects unauthenticated deletion", async () => {
    expect(
      (await app().request(`/v1/videos/${id}`, { method: "DELETE" })).status,
    ).toBe(401);
  });
  it("rejects bad signatures before consuming the shared webhook limit or querying DB", async () => {
    expect(
      (
        await app().request("/v1/videos/webhook/123", {
          method: "POST",
          body: "{}",
        })
      ).status,
    ).toBe(401);
    expect(mocks.rate).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it.each([
    "limit=41",
    "limit=0",
    "limit=1.2",
    "limit=oops",
    "cursor=" + "x".repeat(301),
  ])("rejects unbounded/invalid page %s", async (query) => {
    expect((await app().request(`/v1/videos/films?${query}`)).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("requires authentication for the creator library", async () => {
    expect((await app().request("/v1/videos/films?mine=true")).status).toBe(
      401,
    );
  });
  it.each([
    { visibility: "private", publishedAt: new Date(), releaseAt: new Date(0) },
    { visibility: "public", publishedAt: null, releaseAt: new Date(0) },
    {
      visibility: "public",
      publishedAt: new Date(),
      releaseAt: new Date(Date.now() + 86400000),
    },
  ])(
    "does not issue public playback for private, draft or scheduled films",
    async (restriction) => {
      mocks.rows = [
        {
          asset: {
            id,
            userId: "owner",
            state: "ready",
            postId: null,
            ...restriction,
          },
        },
      ];
      const response = await app().request(`/v1/videos/${id}/playback`);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("issues only a short playback grant for an accessible released film", async () => {
    mocks.rows = [
      {
        asset: {
          id,
          providerId: id,
          libraryId: "123",
          userId: "owner",
          state: "ready",
          postId: null,
          visibility: "unlisted",
          publishedAt: new Date(),
          releaseAt: new Date(0),
        },
      },
    ];
    const response = await app().request(`/v1/videos/${id}/playback`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.expires).toBeLessThanOrEqual(
      Math.floor(Date.now() / 1000) + 300,
    );
    expect(body.embedUrl).toContain("token=");
    expect(JSON.stringify(body)).not.toContain("test-api");
  });
});

describe("pending playback", () => {
  it.each(["processing", "failed"])("returns %s without signing media URLs after post authorization", async (state) => {
    const query = { from: () => query, innerJoin: () => query, where: () => query,
      limit: vi.fn().mockResolvedValueOnce([{ asset: { id, state, postId: "post", userId: "owner" } }])
        .mockResolvedValueOnce([{ id: "post" }]) };
    mocks.select.mockReturnValue(query);
    const response = await app().request(`/v1/videos/${id}/playback`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state, message: expect.any(String) });
    expect(query.limit).toHaveBeenCalledTimes(2);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("does not disclose processing state for an inaccessible or deleted post", async () => {
    const query = { from: () => query, innerJoin: () => query, where: () => query,
      limit: vi.fn().mockResolvedValueOnce([{ asset: { id, state: "processing", postId: "post", userId: "owner" } }])
        .mockResolvedValueOnce([]) };
    mocks.select.mockReturnValue(query);
    expect((await app().request(`/v1/videos/${id}/playback`)).status).toBe(404);
  });
});

describe("upload acknowledgement", () => {
  it("returns processing status immediately without calling the provider", async () => {
    mocks.viewer = { userId: "owner" };
    const uploading = { id, state: "uploading", userId: "owner" };
    mocks.rows = [uploading];
    const returning = vi.fn().mockResolvedValue([{ ...uploading, state: "processing" }]);
    mocks.update.mockReturnValue({ set: () => ({ where: () => ({ returning }) }) });
    const response = await app().request(`/v1/videos/${id}/complete`, { method: "POST" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id, state: "processing" });
  });
  it("returns current ready state on a repeated acknowledgement", async () => {
    mocks.viewer = { userId: "owner" };
    mocks.rows = [{ id, state: "ready", userId: "owner" }];
    mocks.update.mockReturnValue({ set: () => ({ where: () => ({ returning: async () => [] }) }) });
    const response = await app().request(`/v1/videos/${id}/complete`, { method: "POST" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id, state: "ready" });
  });
});
