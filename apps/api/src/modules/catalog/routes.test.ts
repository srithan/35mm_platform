import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { catalogTitleSearchQuerySchema } from "@35mm/validators";
import { decodeCatalogReadCursor, encodeCatalogReadCursor } from "./readService.js";

describe("catalog read cursors", function () {
  it("round-trips opaque cursor payloads", function () {
    var cursor = { sortTitle: "alien", startYear: 1979, id: "01HX0000000000000000000000" };
    expect(decodeCatalogReadCursor(encodeCatalogReadCursor(cursor))).toEqual(cursor);
  });

  it("rejects invalid cursor payloads", function () {
    expect(decodeCatalogReadCursor("not-base64-json")).toBeNull();
  });
});

describe("catalog validators", function () {
  it("caps title search limit at 100", function () {
    expect(function () {
      catalogTitleSearchQuerySchema.parse({ limit: "101" });
    }).toThrow();
  });
});

describe("catalog route source trust", function () {
  afterEach(function () {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("derives source server-side and requires idempotency", async function () {
    var stagedInputs: unknown[] = [];
    vi.doMock("@clerk/backend", function () {
      return {
        createClerkClient: function () {
          return {
            users: {
              getUser: async function () {
                return { publicMetadata: {}, unsafeMetadata: {} };
              },
            },
          };
        },
      };
    });
    vi.doMock("../../lib/middleware.js", function () {
      return {
        requireAuth: async function (c: any, next: () => Promise<void>) {
          c.set("user", {
            clerkUserId: "clerk_1",
            userId: "00000000-0000-4000-8000-000000000001",
            username: "person",
            displayName: "Person",
            avatarUrl: null,
          });
          await next();
        },
      };
    });
    vi.doMock("../../lib/rateLimit.js", function () {
      return {
        identifyByUserId: function () {
          return "user";
        },
        createRateLimitMiddleware: function () {
          return async function (_c: any, next: () => Promise<void>) {
            await next();
          };
        },
      };
    });
    vi.doMock("./mutations.js", function () {
      return {
        stageCatalogEdit: async function (input: unknown) {
          stagedInputs.push(input);
          return {
            outcome: "created",
            edit: {
              id: "01HX0000000000000000000000",
              status: "pending_review",
              source: "contribution",
              summary: "Add title",
              publicVisible: true,
              createdAt: "2026-07-07T00:00:00.000Z",
              updatedAt: "2026-07-07T00:00:00.000Z",
            },
          };
        },
        applyCatalogEdit: vi.fn(),
        rejectCatalogEdit: vi.fn(),
        revertCatalogEdit: vi.fn(),
        mergeCatalogEntities: vi.fn(),
      };
    });

    var { catalogRoutes } = await import("./routes.js");
    var app = new Hono();
    app.onError(function (err: any, c) {
      return c.json({ code: err.code ?? "INTERNAL_ERROR", message: err.message }, err.status ?? 500);
    });
    app.route("/v1/catalog", catalogRoutes);
    var missingKey = await app.request("/v1/catalog/titles", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
      body: JSON.stringify({
        source: "studio",
        summary: "Add title",
        data: { type: "movie", primaryTitle: "Alien", sortTitle: "alien", slug: "alien" },
      }),
    });
    expect(missingKey.status).toBe(400);

    var response = await app.request("/v1/catalog/titles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
        "Idempotency-Key": "catalog-route-test-1",
      },
      body: JSON.stringify({
        source: "studio",
        summary: "Add title",
        data: { type: "movie", primaryTitle: "Alien", sortTitle: "alien", slug: "alien" },
      }),
    });
    expect(response.status).toBe(201);
    expect((stagedInputs[0] as any).source).toBe("contribution");

    var titleGenre = await app.request("/v1/catalog/title-genres", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
        "Idempotency-Key": "catalog-route-test-2",
      },
      body: JSON.stringify({
        summary: "Tag title",
        data: {
          titleId: "01HX0000000000000000000000",
          genreId: "01HX0000000000000000000001",
          sortOrder: 1,
        },
      }),
    });
    expect(titleGenre.status).toBe(201);
    expect((stagedInputs[1] as any).operations[0].entityType).toBe("title_genre");
  });

  it("uses verified token metadata when Clerk user metadata lookup fails", async function () {
    var stagedInputs: unknown[] = [];
    vi.doMock("@clerk/backend", function () {
      return {
        createClerkClient: function () {
          return {
            users: {
              getUser: async function () {
                var error = new Error("Not Found") as Error & { status?: number; code?: string };
                error.status = 404;
                error.code = "NOT_FOUND";
                throw error;
              },
            },
          };
        },
      };
    });
    vi.doMock("../../lib/middleware.js", function () {
      return {
        requireAuth: async function (c: any, next: () => Promise<void>) {
          c.set("user", {
            clerkUserId: "clerk_1",
            clerkAuthSource: "studio",
            userId: "00000000-0000-4000-8000-000000000001",
            username: "person",
            displayName: "Person",
            avatarUrl: null,
            publicMetadata: { studioRole: "admin" },
          });
          await next();
        },
      };
    });
    vi.doMock("../../lib/rateLimit.js", function () {
      return {
        identifyByUserId: function () {
          return "user";
        },
        createRateLimitMiddleware: function () {
          return async function (_c: any, next: () => Promise<void>) {
            await next();
          };
        },
      };
    });
    vi.doMock("./mutations.js", function () {
      return {
        stageCatalogEdit: async function (input: unknown) {
          stagedInputs.push(input);
          return {
            outcome: "applied",
            edit: {
              id: "01HX0000000000000000000000",
              status: "applied",
              source: "studio",
              summary: "Add title",
              publicVisible: true,
              createdAt: "2026-07-07T00:00:00.000Z",
              updatedAt: "2026-07-07T00:00:00.000Z",
            },
          };
        },
        applyCatalogEdit: vi.fn(),
        rejectCatalogEdit: vi.fn(),
        revertCatalogEdit: vi.fn(),
        mergeCatalogEntities: vi.fn(),
      };
    });

    var { catalogRoutes } = await import("./routes.js");
    var app = new Hono();
    app.onError(function (err: any, c) {
      return c.json({ code: err.code ?? "INTERNAL_ERROR", message: err.message }, err.status ?? 500);
    });
    app.route("/v1/catalog", catalogRoutes);

    var response = await app.request("/v1/catalog/titles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
        "Idempotency-Key": "catalog-route-test-token-metadata",
      },
      body: JSON.stringify({
        source: "contribution",
        summary: "Add title",
        data: { type: "movie", primaryTitle: "Alien", sortTitle: "alien", slug: "alien" },
      }),
    });

    expect(response.status).toBe(201);
    expect((stagedInputs[0] as any).source).toBe("studio");
  });

  it("falls back to Studio Clerk secret when verified auth source cannot read user metadata", async function () {
    var stagedInputs: unknown[] = [];
    vi.stubEnv("CLERK_SECRET_KEY", "platform-key");
    vi.stubEnv("STUDIO_CLERK_SECRET_KEY", "studio-key");
    vi.doMock("@clerk/backend", function () {
      return {
        createClerkClient: function (input: { secretKey?: string }) {
          return {
            users: {
              getUser: async function () {
                if (input.secretKey === "studio-key") {
                  return { publicMetadata: { studioRole: "admin" }, unsafeMetadata: {} };
                }
                var error = new Error("Not Found") as Error & { status?: number; code?: string };
                error.status = 404;
                error.code = "NOT_FOUND";
                throw error;
              },
            },
          };
        },
      };
    });
    vi.doMock("../../lib/middleware.js", function () {
      return {
        requireAuth: async function (c: any, next: () => Promise<void>) {
          c.set("user", {
            clerkUserId: "clerk_1",
            clerkAuthSource: "platform",
            clerkSecretKey: "platform-key",
            userId: "00000000-0000-4000-8000-000000000001",
            username: "person",
            displayName: "Person",
            avatarUrl: null,
          });
          await next();
        },
      };
    });
    vi.doMock("../../lib/rateLimit.js", function () {
      return {
        identifyByUserId: function () {
          return "user";
        },
        createRateLimitMiddleware: function () {
          return async function (_c: any, next: () => Promise<void>) {
            await next();
          };
        },
      };
    });
    vi.doMock("./mutations.js", function () {
      return {
        stageCatalogEdit: async function (input: unknown) {
          stagedInputs.push(input);
          return {
            outcome: "applied",
            edit: {
              id: "01HX0000000000000000000000",
              status: "applied",
              source: "studio",
              summary: "Add title",
              publicVisible: true,
              createdAt: "2026-07-07T00:00:00.000Z",
              updatedAt: "2026-07-07T00:00:00.000Z",
            },
          };
        },
        applyCatalogEdit: vi.fn(),
        rejectCatalogEdit: vi.fn(),
        revertCatalogEdit: vi.fn(),
        mergeCatalogEntities: vi.fn(),
      };
    });

    var { catalogRoutes } = await import("./routes.js");
    var app = new Hono();
    app.onError(function (err: any, c) {
      return c.json({ code: err.code ?? "INTERNAL_ERROR", message: err.message }, err.status ?? 500);
    });
    app.route("/v1/catalog", catalogRoutes);

    var response = await app.request("/v1/catalog/titles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test",
        "Idempotency-Key": "catalog-route-test-studio-secret-fallback",
      },
      body: JSON.stringify({
        source: "contribution",
        summary: "Add title",
        data: { type: "movie", primaryTitle: "Alien", sortTitle: "alien", slug: "alien" },
      }),
    });

    expect(response.status).toBe(201);
    expect((stagedInputs[0] as any).source).toBe("studio");
  });
});

describe("catalog query implementation", function () {
  it("does not use OFFSET pagination in catalog module sources", function () {
    var files = ["routes.ts", "readService.ts"];
    for (var file of files) {
      var contents = readFileSync(resolve(process.cwd(), "src/modules/catalog", file), "utf8");
      expect(contents.toLowerCase()).not.toContain("offset ");
    }
  });
});
