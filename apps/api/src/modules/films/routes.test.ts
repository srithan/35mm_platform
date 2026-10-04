import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ select: vi.fn(), from: vi.fn(), where: vi.fn(), limit: vi.fn() }));
vi.mock("../../lib/db.js", () => ({ getDb: () => database }));
vi.mock("../../lib/filmLists.js", () => ({ resolveFilmId: vi.fn() }));
vi.mock("../../lib/middleware.js", () => ({
  requireAuth: async function (c: any, next: () => Promise<void>) {
    c.set("user", {
      userId: "11111111-1111-4111-8111-111111111111",
      clerkUserId: "clerk-1",
      username: "viewer",
      displayName: "Viewer",
      avatarUrl: null,
    });
    await next();
  },
}));
vi.mock("../../lib/rateLimit.js", () => ({
  identifyByIp: vi.fn(), identifyByUserId: vi.fn(),
  createRateLimitMiddleware: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));
import { filmRoutes } from "./routes.js";
const app = new Hono();
app.onError((error: any, c) => c.json({ message: error.message }, error.status ?? 500));
app.route("/v1/films", filmRoutes);

beforeEach(() => {
  vi.clearAllMocks();
  database.select.mockReturnValue(database);
  database.from.mockReturnValue(database);
  database.where.mockReturnValue(database);
  database.limit.mockResolvedValue([]);
});

describe("read-only TMDB film reference", () => {
  it.each(["0", "-1", "abc", "1.5", "2147483648"])("rejects invalid ID %s before querying", async (id) => {
    const response = await app.request("/v1/films/tmdb/" + id);
    expect(response.status).toBe(400);
    expect(database.select).not.toHaveBeenCalled();
  });
  it("returns canonical identity with one bounded read and no shared cache", async () => {
    database.limit.mockResolvedValue([{ filmId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" }]);
    const response = await app.request("/v1/films/tmdb/550");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ filmId: "01ARZ3NDEKTSV4RRFFQ69G5FAV" });
    expect(database.limit).toHaveBeenCalledWith(1);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("returns null for an absent film without creating a catalog record", async () => {
    const response = await app.request("/v1/films/tmdb/550");
    expect(await response.json()).toEqual({ filmId: null });
  });
});

describe("film viewer state", () => {
  it("returns bounded watched, review, and watchlist state without shared caching", async () => {
    database.limit.mockResolvedValue([{
      filmId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      isWatched: true,
      isInWatchlist: false,
      hasReviewed: true,
    }]);

    const response = await app.request(
      "/v1/films/01ARZ3NDEKTSV4RRFFQ69G5FAV/viewer-state",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      filmId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      isWatched: true,
      isInWatchlist: false,
      hasReviewed: true,
    });
    expect(database.limit).toHaveBeenCalledWith(1);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects an invalid canonical film ID before querying", async () => {
    const response = await app.request("/v1/films/not-a-film/viewer-state");
    expect(response.status).toBe(400);
    expect(database.select).not.toHaveBeenCalled();
  });
});
