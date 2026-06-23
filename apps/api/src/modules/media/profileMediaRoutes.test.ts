import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";

function stubRequiredEnv() {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
  vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test");
  vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("R2_BUCKET", "35mm-media");
  vi.stubEnv("R2_PUBLIC_BASE_URL", "https://media.example.com");
}

function queryFor(responses: unknown[][]) {
  var query: Record<string, unknown> = {};
  var chainMethods = ["from", "innerJoin", "leftJoin", "where", "orderBy", "groupBy"];
  for (var method of chainMethods) {
    query[method] = vi.fn(function () {
      return query;
    });
  }
  query.limit = vi.fn(function () {
    return Promise.resolve(responses.shift() ?? []);
  });
  query.then = function (
    resolve: (value: unknown[]) => unknown,
    reject: (reason: unknown) => unknown
  ) {
    return Promise.resolve(responses.shift() ?? []).then(resolve, reject);
  };
  return query;
}

async function importRoutesWithDbResponses(responses: unknown[][]) {
  stubRequiredEnv();
  vi.doMock("../../lib/db.js", function () {
    return {
      getDb: function () {
        return {
          select: vi.fn(function () {
            return queryFor(responses);
          }),
        };
      },
    };
  });
  vi.doMock("../../lib/middleware.js", function () {
    return {
      requireAuth: async function (c: any, next: () => Promise<void>) {
        c.set("user", {
          clerkUserId: "clerk_1",
          userId: "user_1",
          username: "person",
          displayName: "Person",
          avatarUrl: null,
        });
        await next();
      },
      getOptionalAuthUser: async function () {
        return null;
      },
    };
  });

  var [{ authRoutes }, { profileRoutes }] = await Promise.all([
    import("../auth/routes.js"),
    import("../profiles/routes.js"),
  ]);

  return { authRoutes, profileRoutes };
}

function expectStableAvatarUrl(value: unknown, expected: string) {
  expect(value).toBe(expected);
  expect(String(value)).not.toContain("X-Amz-Signature");
  expect(String(value)).not.toMatch(/^[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i);
}

describe("profile media route responses", function () {
  afterEach(function () {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("GET /v1/me resolves bare avatar filenames before responding", async function () {
    var rawAvatar = "mqpxglbu-65425433-46b5-40dd-93ca-4d0c6217cfb4.jpg";
    var { authRoutes } = await importRoutesWithDbResponses([
      [
        {
          username: "person",
          displayName: "Person",
          avatarUrl: rawAvatar,
          role: null,
          roleContext: null,
          filmsLoggedCount: 0,
        },
      ],
    ]);
    var app = new Hono().route("/v1", authRoutes);

    var response = await app.request("/v1/me", {
      headers: { Authorization: "Bearer test" },
    });
    var body = await response.json();

    expect(response.status).toBe(200);
    expectStableAvatarUrl(
      body.avatarUrl,
      "https://media.example.com/users/user_1/avatar/" + rawAvatar
    );
  });

  it("GET /v1/profiles/:username resolves bare avatar and cover filenames before responding", async function () {
    var rawAvatar = "mqpxglbu-65425433-46b5-40dd-93ca-4d0c6217cfb4.jpg";
    var rawCover = "cover-65425433-46b5-40dd-93ca-4d0c6217cfb4.webp";
    var { profileRoutes } = await importRoutesWithDbResponses([
      [
        {
          userId: "user_2",
          username: "person",
          displayName: "Person",
          bio: null,
          avatarUrl: rawAvatar,
          coverUrl: rawCover,
          location: null,
          website: null,
          dateOfBirth: null,
          role: null,
          roleContext: null,
          headline: null,
          headlineContext: null,
          isPrivate: false,
          filmsLoggedCount: 0,
          status: "active",
          createdAt: new Date("2026-06-22T00:00:00.000Z"),
        },
      ],
      [],
      [],
    ]);
    var app = new Hono().route("/v1/profiles", profileRoutes);

    var response = await app.request("/v1/profiles/person");
    var body = await response.json();

    expect(response.status).toBe(200);
    expectStableAvatarUrl(
      body.avatarUrl,
      "https://media.example.com/users/user_2/avatar/" + rawAvatar
    );
    expect(body.coverUrl).toBe("https://media.example.com/users/user_2/cover/" + rawCover);
    expect(body.coverUrl).not.toContain("X-Amz-Signature");
  });
});
