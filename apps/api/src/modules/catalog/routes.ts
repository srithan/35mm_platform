import { createClerkClient } from "@clerk/backend";
import { Hono } from "hono";
import type { Context } from "hono";
import { sql } from "drizzle-orm";
import type { CatalogEntityType } from "@35mm/types";
import {
  catalogHistoryQuerySchema,
  catalogWorkflowPayloadSchema,
  stageCatalogEditSchema,
} from "@35mm/validators";
import { badRequest, forbidden } from "../../lib/errors.js";
import { getDb } from "../../lib/db.js";
import { requireAuth, type AuthUser } from "../../lib/middleware.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import {
  applyCatalogEdit,
  rejectCatalogEdit,
  revertCatalogEdit,
  stageCatalogEdit,
} from "./mutations.js";
import {
  decodeCatalogHistoryCursor,
  encodeCatalogHistoryCursor,
  toCatalogEditDto,
} from "./serializer.js";

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

async function catalogWriteRoleForUser(user: AuthUser): Promise<StudioRole> {
  var clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
  var clerkUser = await clerk.users.getUser(user.clerkUserId);
  var publicMetadata = isRecord(clerkUser.publicMetadata) ? clerkUser.publicMetadata : {};
  var unsafeMetadata = isRecord(clerkUser.unsafeMetadata) ? clerkUser.unsafeMetadata : {};
  return normalizeStudioRole(
    publicMetadata.studioRole ??
      publicMetadata.role ??
      unsafeMetadata.studioRole ??
      unsafeMetadata.role
  );
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
  serverSource: "studio" | "contribution"
) {
  if (!isRecord(body)) throw badRequest("Invalid catalog request body");
  if ("operations" in body) {
    var parsed;
    try {
      parsed = stageCatalogEditSchema.parse({
        ...body,
        source: serverSource,
        idempotencyKey: idempotencyKey ?? body.idempotencyKey ?? null,
      });
    } catch (error) {
      throw badRequest(zodMessage(error));
    }
    return { ...parsed, actorUserId: user.userId };
  }

  var data = isRecord(body.data) ? body.data : null;
  if (!data) throw badRequest("Catalog request body must include data or operations");
  var action = body.action === "update" || body.action === "delete" || body.action === "create"
    ? body.action
    : typeof body.entityId === "string"
      ? "update"
      : "create";

  var parsed;
  try {
    parsed = stageCatalogEditSchema.parse({
      source: serverSource,
      summary: typeof body.summary === "string" ? body.summary : "Catalog " + action,
      rationale: typeof body.rationale === "string" ? body.rationale : null,
      idempotencyKey: idempotencyKey ?? (typeof body.idempotencyKey === "string" ? body.idempotencyKey : null),
      publicVisible: typeof body.publicVisible === "boolean" ? body.publicVisible : true,
      sourceSnapshotAt: typeof body.sourceSnapshotAt === "string" ? body.sourceSnapshotAt : null,
      operations: [{
        entityType,
        action,
        entityId: typeof body.entityId === "string" ? body.entityId : undefined,
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

async function stageEntity(c: Context, entityType: CatalogEntityType) {
  var user = c.get("user") as AuthUser;
  var body = await c.req.json();
  var role = await catalogWriteRoleForUser(user);
  var serverSource: "studio" | "contribution" = roleCanWriteCatalog(role) ? "studio" : "contribution";
  var input = normalizeStageBody(
    entityType,
    body,
    user,
    idempotencyKeyFromHeaders(c.req.header("Idempotency-Key")),
    serverSource
  );
  var result = await stageCatalogEdit(input);
  return c.json(result, result.outcome === "existing" ? 200 : 201);
}

catalogRoutes.post("/titles", requireAuth, catalogWriteRateLimit, async function (c) {
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
  var query;
  try {
    query = catalogHistoryQuerySchema.parse({
      cursor: c.req.query("cursor") || undefined,
      limit: c.req.query("limit"),
    });
  } catch (error) {
    throw badRequest(zodMessage(error));
  }
  var cursor = decodeCatalogHistoryCursor(query.cursor);
  if (query.cursor && !cursor) throw badRequest("Invalid catalog history cursor");

  var rows = await getDb().execute(sql`
    select
      e."id",
      e."status",
      e."source",
      e."summary",
      e."public_visible" as "publicVisible",
      e."created_at" as "createdAt",
      e."updated_at" as "updatedAt",
      r."created_at" as "historyCreatedAt",
      r."id" as "historyId"
    from "catalog_revisions" r
    inner join "catalog_edits" e on e."id" = r."edit_id"
    where r."entity_type" = 'title'
      and r."entity_id" = ${c.req.param("id")}
      and r."public_visible" = true
      and e."public_visible" = true
      ${cursor ? sql`
        and (
          r."created_at" < ${cursor.createdAt}
          or (r."created_at" = ${cursor.createdAt} and r."id" < ${cursor.id})
        )
      ` : sql.raw("")}
    order by r."created_at" desc, r."id" desc
    limit ${query.limit + 1}
  `);

  var rawRows = (rows.rows ?? []) as Array<{
    id: string;
    status: "pending_review" | "applied" | "rejected" | "reverted" | "superseded";
    source: "studio" | "contribution" | "import" | "system";
    summary: string;
    publicVisible: boolean;
    createdAt: Date;
    updatedAt: Date;
    historyCreatedAt: Date;
    historyId: string;
  }>;
  var pageRows = rawRows.slice(0, query.limit);
  var tail = pageRows[pageRows.length - 1];
  var hasMore = rawRows.length > query.limit;
  return c.json({
    items: pageRows.map(toCatalogEditDto),
    hasMore,
    nextCursor: hasMore && tail
      ? encodeCatalogHistoryCursor({ createdAt: tail.historyCreatedAt, id: tail.historyId })
      : null,
  });
});
