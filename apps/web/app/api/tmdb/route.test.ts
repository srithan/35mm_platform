import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./[...path]/route";

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.10" }) }));

const REDIS_URL = "https://redis.example.upstash.io";

function tmdbRequest(path = "search/movie?query=heat") {
  return new NextRequest(`https://35mm.test/api/tmdb/${path}`, {
    headers: {
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

function routeParams(path = ["search", "movie"]) {
  return { params: Promise.resolve({ path }) };
}

function commandFrom(init?: RequestInit): Array<string | number> {
  return JSON.parse(String(init?.body ?? "[]")) as Array<string | number>;
}

describe("/api/tmdb proxy", function () {
  afterEach(function () {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns cached TMDB payload without calling TMDB", async function () {
    vi.stubEnv("TMDB_API_KEY", "tmdb-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", REDIS_URL);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");

    const fetchMock = vi.fn(async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = String(input);
      if (url === REDIS_URL) {
        const command = commandFrom(init);
        if (command[0] === "incr") return Response.json({ result: 1 });
        if (command[0] === "expire") return Response.json({ result: 1 });
        if (command[0] === "get") {
          return Response.json({
            result: JSON.stringify({
              status: 200,
              data: { results: [{ id: 949, title: "Heat" }] },
              cachedAt: "2026-07-04T00:00:00.000Z",
            }),
          });
        }
      }
      return Response.json({ error: "unexpected fetch" }, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(tmdbRequest(), routeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-35mm-TMDB-Cache")).toBe("HIT");
    expect(body.results[0].title).toBe("Heat");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches successful TMDB responses", async function () {
    vi.stubEnv("TMDB_API_KEY", "tmdb-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", REDIS_URL);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");

    let setexCommand: Array<string | number> | null = null;
    const fetchMock = vi.fn(async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = String(input);
      if (url === REDIS_URL) {
        const command = commandFrom(init);
        if (command[0] === "incr") return Response.json({ result: 1 });
        if (command[0] === "expire") return Response.json({ result: 1 });
        if (command[0] === "get") return Response.json({ result: null });
        if (command[0] === "setex") {
          setexCommand = command;
          return Response.json({ result: "OK" });
        }
      }
      if (url.startsWith("https://api.themoviedb.org/3/search/movie")) {
        return Response.json({ results: [{ id: 949, title: "Heat" }] });
      }
      return Response.json({ error: "unexpected fetch" }, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(tmdbRequest(), routeParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-35mm-TMDB-Cache")).toBe("MISS");
    expect(body.results[0].id).toBe(949);
    expect(setexCommand?.[0]).toBe("setex");
    expect(setexCommand?.[2]).toBe(12 * 60 * 60);
  });

  it("returns TMDB details without caching when person slug enrichment is transiently unavailable", async function () {
    vi.stubEnv("TMDB_API_KEY", "tmdb-key");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.35mm.test");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", REDIS_URL);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    vi.spyOn(console, "warn").mockImplementation(function () {});

    let setexCommand: Array<string | number> | null = null;
    const fetchMock = vi.fn(async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = String(input);
      if (url === REDIS_URL) {
        const command = commandFrom(init);
        if (command[0] === "incr") return Response.json({ result: 1 });
        if (command[0] === "expire") return Response.json({ result: 1 });
        if (command[0] === "get") return Response.json({ result: null });
        if (command[0] === "setex") {
          setexCommand = command;
          return Response.json({ result: "OK" });
        }
      }
      if (url.startsWith("https://api.themoviedb.org/3/movie/1423191")) {
        return Response.json({ id: 1423191, title: "Resident Evil", credits: { cast: [{ id: 1, name: "Performer" }], crew: [] } });
      }
      if (url === "https://api.35mm.test/v1/catalog/people/resolve") {
        expect(JSON.parse(String(init?.body))).toEqual({ kind: "movie", id: 1423191 });
        return Response.json({ code: "TMDB_UNAVAILABLE", message: "Person catalog source is unavailable" }, { status: 503 });
      }
      return Response.json({ error: "unexpected fetch: " + url }, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      tmdbRequest("movie/1423191?person_slugs=1&append_to_response=credits"),
      routeParams(["movie", "1423191"])
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-35mm-TMDB-Cache")).toBe("MISS");
    expect(body.credits.cast).toEqual([{ id: 1, name: "Performer" }]);
    expect(setexCommand).toBeNull();
  });

  it("rate limits before TMDB fetch", async function () {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TMDB_API_KEY", "tmdb-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", REDIS_URL);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");

    const fetchMock = vi.fn(async function (input: RequestInfo | URL, init?: RequestInit) {
      const url = String(input);
      if (url === REDIS_URL) {
        const command = commandFrom(init);
        if (command[0] === "incr") return Response.json({ result: 121 });
        if (command[0] === "ttl") return Response.json({ result: 42 });
      }
      return Response.json({ error: "unexpected fetch" }, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(tmdbRequest(), routeParams());
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(body.error).toContain("Too many TMDB requests");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed when production rate limiter is unavailable", async function () {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TMDB_API_KEY", "tmdb-key");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", REDIS_URL);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "redis-token");
    vi.spyOn(console, "error").mockImplementation(function () {});

    const fetchMock = vi.fn(async function () {
      return Response.json({ error: "redis down" }, { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(tmdbRequest(), routeParams());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain("rate limiter is unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
