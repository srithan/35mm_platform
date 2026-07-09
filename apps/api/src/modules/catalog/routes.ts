import { createClerkClient } from "@clerk/backend";
import { Hono } from "hono";
import type { Context } from "hono";
import type { CatalogEntityType } from "@35mm/types";
import {
  catalogCompanySearchQuerySchema,
  catalogCompanyTitlesQuerySchema,
  catalogCreditsQuerySchema,
  catalogEditQueueQuerySchema,
  catalogHistoryQuerySchema,
  catalogIdParamSchema,
  catalogMediaQuerySchema,
  catalogPeopleSearchQuerySchema,
  catalogReadPageQuerySchema,
  catalogTitleSearchQuerySchema,
  catalogWorkflowPayloadSchema,
  stageCatalogEditSchema,
} from "@35mm/validators";
import { badRequest, forbidden } from "../../lib/errors.js";
import { requireAuth, type AuthUser } from "../../lib/middleware.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import {
  applyCatalogEdit,
  mergeCatalogEntities,
  rejectCatalogEdit,
  revertCatalogEdit,
  stageCatalogEdit,
} from "./mutations.js";
import {
  catalogReadCacheKey,
  getCatalogReadCache,
  setCatalogReadCache,
} from "./readCache.js";
import {
  getCatalogCompany,
  getCatalogEdit,
  getCatalogEditQueue,
  getCatalogPerson,
  getCatalogTitle,
  getCompanyTitles,
  getEntityAliases,
  getEntityHistory,
  getEntityMedia,
  getExternalIds,
  getPersonCredits,
  getTitleAwards,
  getTitleCredits,
  getTitleRelations,
  listCatalogCompanies,
  listCatalogPeople,
  listCatalogTitles,
} from "./readService.js";

export var catalogRoutes = new Hono();

type StudioRole = "owner" | "admin" | "catalog" | "moderation" | "systems" | "viewer";

var catalogWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: "catalog:write",
  limit: 30,
  windowSeconds: 60,
  identify: identifyByUserId,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStudioRole(value: unknown): StudioRole {
  if (typeof value !== "string") return "viewer";
  var role = value.toLowerCase().replace(/^org:/, "").replace(/^studio:/, "");
  if (role === "owner" || role === "super_admin") return "owner";
  if (role === "admin") return "admin";
  if (role === "catalog" || role === "catalog_admin" || role === "catalog_editor") return "catalog";
  if (role === "moderation" || role === "moderator" || role === "trust_safety") return "moderation";
  if (role === "systems" || role === "system" || role === "ops" || role === "infrastructure") return "systems";
  return "viewer";
}

function roleCanWriteCatalog(role: StudioRole): boolean {
  return role === "owner" || role === "admin" || role === "catalog";
}

function configuredClerkSecretKeys(user: AuthUser): Array<{ key: string; source: string }> {
  var seen = new Set<string>();
  var entries = [
    { key: user.clerkSecretKey, source: user.clerkAuthSource ?? "verified" },
    { key: process.env.STUDIO_CLERK_SECRET_KEY, source: "studio" },
    { key: process.env.CLERK_STUDIO_SECRET_KEY, source: "studio_legacy" },
    { key: process.env.CLERK_SECRET_KEY, source: "platform" },
    ...(process.env.CLERK_SECRET_KEYS ?? "").split(",").map(function (key, index) {
      return { key, source: "configured_" + index };
    }),
  ];
  return entries
    .map(function (entry) {
      return { key: entry.key?.trim() ?? "", source: entry.source };
    })
    .filter(function (entry) {
      if (!entry.key || seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    });
}

function roleFromMetadata(
  publicMetadata: Record<string, unknown>,
  unsafeMetadata: Record<string, unknown>
): StudioRole {
  return normalizeStudioRole(
    publicMetadata.studioRole ??
      publicMetadata.role ??
      unsafeMetadata.studioRole ??
      unsafeMetadata.role
  );
}

function logCatalogAuth(
  user: AuthUser,
  role: StudioRole,
  publicMetadata: Record<string, unknown>,
  unsafeMetadata: Record<string, unknown>,
  source: "token" | "clerk"
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info("[catalog.auth]", {
    authSource: user.clerkAuthSource ?? "unknown",
    role,
    source,
    hasPublicStudioRole: typeof publicMetadata.studioRole === "string",
    hasUnsafeStudioRole: typeof unsafeMetadata.studioRole === "string",
  });
}

async function catalogWriteRoleForUser(user: AuthUser): Promise<StudioRole> {
  var tokenPublicMetadata = isRecord(user.publicMetadata) ? user.publicMetadata : {};
  var tokenUnsafeMetadata = isRecord(user.unsafeMetadata) ? user.unsafeMetadata : {};
  var tokenRole = roleFromMetadata(tokenPublicMetadata, tokenUnsafeMetadata);
  if (roleCanWriteCatalog(tokenRole)) {
    logCatalogAuth(user, tokenRole, tokenPublicMetadata, tokenUnsafeMetadata, "token");
    return tokenRole;
  }

  var lastError: unknown;
  for (var secret of configuredClerkSecretKeys(user)) {
    var clerk = createClerkClient({ secretKey: secret.key });
    try {
      var clerkUser = await clerk.users.getUser(user.clerkUserId);
      var publicMetadata = isRecord(clerkUser.publicMetadata) ? clerkUser.publicMetadata : {};
      var unsafeMetadata = isRecord(clerkUser.unsafeMetadata) ? clerkUser.unsafeMetadata : {};
      var role = roleFromMetadata(publicMetadata, unsafeMetadata);
      logCatalogAuth(user, role, publicMetadata, unsafeMetadata, "clerk");
      return role;
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  console.warn("[catalog.auth] clerk user metadata lookup failed", {
    authSource: user.clerkAuthSource ?? "unknown",
    clerkUserId: user.clerkUserId,
    error: lastError,
  });
  logCatalogAuth(user, tokenRole, tokenPublicMetadata, tokenUnsafeMetadata, "token");
  return tokenRole;
}

async function requireCatalogWriteRole(user: AuthUser): Promise<void> {
  var role = await catalogWriteRoleForUser(user);
  if (!roleCanWriteCatalog(role)) {
    throw forbidden("Catalog moderation requires Studio catalog write access");
  }
}

function idempotencyKeyFromHeaders(headerValue: string | undefined): string | null {
  var cleaned = headerValue?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : null;
}

function zodMessage(error: unknown): string {
  var issues = (error as { issues?: Array<{ message?: unknown }> }).issues;
  if (Array.isArray(issues) && typeof issues[0]?.message === "string") {
    return issues[0].message;
  }
  return "Invalid catalog request body";
}

function normalizeStageBody(
  entityType: CatalogEntityType,
  body: unknown,
  user: AuthUser,
  idempotencyKey: string | null,
  serverSource: "studio" | "contribution",
  forced?: { action?: "create" | "update" | "delete"; entityId?: string }
) {
  if (!isRecord(body)) throw badRequest("Invalid catalog request body");
  var resolvedIdempotencyKey = idempotencyKey ?? (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null);
  if (!resolvedIdempotencyKey) throw badRequest("Idempotency-Key is required");
  if ("operations" in body) {
    var parsed;
    try {
      parsed = stageCatalogEditSchema.parse({
        ...body,
        source: serverSource,
        idempotencyKey: resolvedIdempotencyKey,
      });
    } catch (error) {
      throw badRequest(zodMessage(error));
    }
    return { ...parsed, actorUserId: user.userId };
  }

  var action = forced?.action ?? (body.action === "update" || body.action === "delete" || body.action === "create"
    ? body.action
    : typeof body.entityId === "string"
      ? "update"
      : "create");
  var data = action === "delete" ? {} : isRecord(body.data) ? body.data : null;
  if (!data) throw badRequest("Catalog request body must include data or operations");

  var parsed;
  try {
    parsed = stageCatalogEditSchema.parse({
      source: serverSource,
      summary: typeof body.summary === "string" ? body.summary : "Catalog " + action,
      rationale: typeof body.rationale === "string" ? body.rationale : null,
      idempotencyKey: resolvedIdempotencyKey,
      publicVisible: typeof body.publicVisible === "boolean" ? body.publicVisible : true,
      sourceSnapshotAt: typeof body.sourceSnapshotAt === "string" ? body.sourceSnapshotAt : null,
      operations: [{
        entityType,
        action,
        entityId: forced?.entityId ?? (typeof body.entityId === "string" ? body.entityId : undefined),
        data,
        publicVisible: typeof body.publicVisible === "boolean" ? body.publicVisible : true,
      }],
      sources: Array.isArray(body.sources) ? body.sources : [],
    });
  } catch (error) {
    throw badRequest(zodMessage(error));
  }

  return { ...parsed, actorUserId: user.userId };
}

async function stageEntity(
  c: Context,
  entityType: CatalogEntityType,
  forced?: { action?: "create" | "update" | "delete"; entityId?: string }
) {
  var user = c.get("user") as AuthUser;
  var body = await c.req.json().catch(function () {
    return {};
  });
  var role = await catalogWriteRoleForUser(user);
  var serverSource: "studio" | "contribution" = roleCanWriteCatalog(role) ? "studio" : "contribution";
  var input = normalizeStageBody(
    entityType,
    body,
    user,
    idempotencyKeyFromHeaders(c.req.header("Idempotency-Key")),
    serverSource,
    forced
  );
  var result = await stageCatalogEdit(input);
  return c.json(result, result.outcome === "existing" ? 200 : 201);
}

function parseId(c: Context): string {
  try {
    return catalogIdParamSchema.parse({ id: c.req.param("id") }).id;
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
}

function parseQuery<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
}

async function cachedCatalogRead(c: Context, read: () => Promise<unknown>) {
  var key = catalogReadCacheKey(c.req.url);
  var cached = await getCatalogReadCache(key);
  if (cached !== null) return c.json(cached);
  var payload = await read();
  await setCatalogReadCache(key, payload);
  return c.json(payload);
}

catalogRoutes.get("/titles", async function (c) {
  return cachedCatalogRead(c, async function () {
    return listCatalogTitles(parseQuery(catalogTitleSearchQuerySchema, {
    query: c.req.query("query"),
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    type: c.req.query("type"),
    year: c.req.query("year"),
    externalProvider: c.req.query("externalProvider"),
    externalId: c.req.query("externalId"),
    }));
  });
});

catalogRoutes.get("/titles/:id", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getCatalogTitle(parseId(c));
  });
});

catalogRoutes.get("/titles/:id/credits", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getTitleCredits(parseId(c), parseQuery(catalogCreditsQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    department: c.req.query("department"),
    }));
  });
});

catalogRoutes.get("/titles/:id/media", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityMedia("title", parseId(c), parseQuery(catalogMediaQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    type: c.req.query("type"),
    }));
  });
});

catalogRoutes.get("/titles/:id/external-ids", async function (c) {
  return cachedCatalogRead(c, async function () {
    return { items: await getExternalIds("title", parseId(c)) };
  });
});

catalogRoutes.get("/titles/:id/aliases", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityAliases("title", parseId(c), parseQuery(catalogReadPageQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }));
  });
});

catalogRoutes.get("/titles/:id/relations", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getTitleRelations(parseId(c), parseQuery(catalogReadPageQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }));
  });
});

catalogRoutes.get("/titles/:id/awards", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getTitleAwards(parseId(c), parseQuery(catalogReadPageQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }));
  });
});

catalogRoutes.get("/people", async function (c) {
  return cachedCatalogRead(c, async function () {
    return listCatalogPeople(parseQuery(catalogPeopleSearchQuerySchema, {
    query: c.req.query("query"),
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }));
  });
});

catalogRoutes.get("/people/:id", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getCatalogPerson(parseId(c));
  });
});

catalogRoutes.get("/people/:id/credits", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getPersonCredits(parseId(c), parseQuery(catalogCreditsQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    department: c.req.query("department"),
    }));
  });
});

catalogRoutes.get("/people/:id/media", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityMedia("person", parseId(c), parseQuery(catalogMediaQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    type: c.req.query("type"),
    }));
  });
});

catalogRoutes.get("/people/:id/external-ids", async function (c) {
  return cachedCatalogRead(c, async function () {
    return { items: await getExternalIds("person", parseId(c)) };
  });
});

catalogRoutes.get("/people/:id/aliases", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityAliases("person", parseId(c), parseQuery(catalogReadPageQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }));
  });
});

catalogRoutes.get("/companies", async function (c) {
  return cachedCatalogRead(c, async function () {
    return listCatalogCompanies(parseQuery(catalogCompanySearchQuerySchema, {
    query: c.req.query("query"),
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }));
  });
});

catalogRoutes.get("/companies/:id", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getCatalogCompany(parseId(c));
  });
});

catalogRoutes.get("/companies/:id/titles", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getCompanyTitles(parseId(c), parseQuery(catalogCompanyTitlesQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    role: c.req.query("role"),
    }));
  });
});

catalogRoutes.get("/companies/:id/external-ids", async function (c) {
  return cachedCatalogRead(c, async function () {
    return { items: await getExternalIds("company", parseId(c)) };
  });
});

catalogRoutes.post("/titles", requireAuth, catalogWriteRateLimit, async function (c) {
  if (process.env.NODE_ENV !== "production") {
    console.info("[catalog.write]", { method: "POST", path: "/v1/catalog/titles" });
  }
  return stageEntity(c, "title");
});

catalogRoutes.post("/people", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "person");
});

catalogRoutes.post("/credits", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "credit");
});

catalogRoutes.post("/media", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "media_asset");
});

catalogRoutes.post("/external-ids", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "external_id");
});

catalogRoutes.post("/aliases", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "alias");
});

catalogRoutes.post("/title-relations", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "title_relation");
});

catalogRoutes.post("/title-companies", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "title_company");
});

catalogRoutes.post("/title-genres", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "title_genre");
});

catalogRoutes.post("/companies", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "company");
});

catalogRoutes.post("/awards", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "award");
});

catalogRoutes.post("/award-events", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "award_event");
});

catalogRoutes.post("/award-nominations", requireAuth, catalogWriteRateLimit, async function (c) {
  return stageEntity(c, "award_nomination");
});

var pathEntityTypes: Array<[string, CatalogEntityType]> = [
  ["titles", "title"],
  ["people", "person"],
  ["credits", "credit"],
  ["media", "media_asset"],
  ["external-ids", "external_id"],
  ["aliases", "alias"],
  ["title-relations", "title_relation"],
  ["title-companies", "title_company"],
  ["title-genres", "title_genre"],
  ["companies", "company"],
  ["awards", "award"],
  ["award-events", "award_event"],
  ["award-nominations", "award_nomination"],
];

for (let [path, entityType] of pathEntityTypes) {
  catalogRoutes.patch("/" + path + "/:id", requireAuth, catalogWriteRateLimit, async function (c) {
    return stageEntity(c, entityType, { action: "update", entityId: parseId(c) });
  });
  catalogRoutes.delete("/" + path + "/:id", requireAuth, catalogWriteRateLimit, async function (c) {
    return stageEntity(c, entityType, { action: "delete", entityId: parseId(c) });
  });
}

catalogRoutes.post("/merge", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await requireCatalogWriteRole(user);
  var body = await c.req.json().catch(function () {
    return {};
  });
  if (!isRecord(body)) throw badRequest("Invalid catalog merge body");
  var idempotencyKey = idempotencyKeyFromHeaders(c.req.header("Idempotency-Key")) ??
    (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null);
  if (!idempotencyKey) throw badRequest("Idempotency-Key is required");
  var edit = await mergeCatalogEntities({
    ...body,
    source: "studio",
    actorUserId: user.userId,
    idempotencyKey,
  } as any);
  return c.json({ edit }, 201);
});

catalogRoutes.get("/edits", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await requireCatalogWriteRole(user);
  return c.json(await getCatalogEditQueue(parseQuery(catalogEditQueueQuerySchema, {
    status: c.req.query("status"),
    entityType: c.req.query("entityType"),
    entityId: c.req.query("entityId"),
    source: c.req.query("source"),
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  })));
});

catalogRoutes.get("/edits/:id", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await requireCatalogWriteRole(user);
  return c.json({ edit: await getCatalogEdit(parseId(c)) });
});

catalogRoutes.post("/edits/:id/approve", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await requireCatalogWriteRole(user);
  try {
    catalogWorkflowPayloadSchema.parse(await c.req.json().catch(function () {
      return {};
    }));
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
  var edit = await applyCatalogEdit(c.req.param("id"), user.userId);
  return c.json({ edit });
});

catalogRoutes.post("/edits/:id/reject", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await requireCatalogWriteRole(user);
  try {
    catalogWorkflowPayloadSchema.parse(await c.req.json().catch(function () {
      return {};
    }));
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
  var edit = await rejectCatalogEdit(c.req.param("id"), user.userId);
  return c.json({ edit });
});

catalogRoutes.post("/edits/:id/revert", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await requireCatalogWriteRole(user);
  try {
    catalogWorkflowPayloadSchema.parse(await c.req.json().catch(function () {
      return {};
    }));
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
  var edit = await revertCatalogEdit(c.req.param("id"), user.userId);
  return c.json({ edit });
});

catalogRoutes.get("/titles/:id/history", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityHistory("title", parseId(c), parseQuery(catalogHistoryQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }), false);
  });
});

catalogRoutes.get("/people/:id/history", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityHistory("person", parseId(c), parseQuery(catalogHistoryQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }), false);
  });
});

catalogRoutes.get("/companies/:id/history", async function (c) {
  return cachedCatalogRead(c, async function () {
    return getEntityHistory("company", parseId(c), parseQuery(catalogHistoryQuerySchema, {
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
    }), false);
  });
});
