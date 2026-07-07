import { Hono } from "hono";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { contributionSubmissions } from "@35mm/db/schema";
import {
  contributionSubmissionSchema,
  cursorPaginationSchema,
  type ContributionSubmissionInput,
} from "@35mm/validators";
import type {
  ContributionSubmission,
  ContributionSubmissionPage,
} from "@35mm/types";
import { getDb, getWriteDb } from "../../lib/db.js";
import { badRequest } from "../../lib/errors.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { requireAuth } from "../../lib/middleware.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";

export var contributionRoutes = new Hono();

var contributionSubmitRateLimit = createRateLimitMiddleware({
  keyPrefix: "contributions:submit",
  limit: 20,
  windowSeconds: 60,
  identify: identifyByUserId,
});

function cleanIdempotencyKey(value: string | undefined): string {
  var key = value?.trim() ?? "";
  if (key.length < 8 || key.length > 120) {
    throw badRequest("Idempotency-Key must be 8-120 characters");
  }
  return key;
}

function firstSource(payload: Record<string, unknown>): string | null {
  var sourceUrls = payload.sourceUrls;
  if (!Array.isArray(sourceUrls)) return null;
  var first = sourceUrls.find(function (value) {
    return typeof value === "string" && value.trim().length > 0;
  });
  return typeof first === "string" ? first : null;
}

function deriveContributionSummary(input: ContributionSubmissionInput): {
  title: string;
  summary: string;
  entityType: string | null;
  entityId: string | null;
} {
  switch (input.kind) {
    case "add_title":
      return {
        title: input.payload.originalTitle,
        summary: `${input.payload.titleType} · ${input.payload.releaseYear}`,
        entityType: "title",
        entityId: input.payload.imdbUrl ?? null,
      };
    case "edit_title":
      return {
        title: input.payload.targetTitle,
        summary: input.payload.changeAreas.join(", "),
        entityType: "title",
        entityId: input.payload.targetTitle,
      };
    case "credits":
      return {
        title: input.payload.targetTitle,
        summary: `${input.payload.action} credit · ${input.payload.personName} · ${input.payload.job}`,
        entityType: "title",
        entityId: input.payload.targetTitle,
      };
    case "person_update":
      return {
        title: input.payload.personUrlOrId,
        summary: input.payload.changeType,
        entityType: "person",
        entityId: input.payload.personUrlOrId,
      };
    case "media":
      return {
        title: input.payload.target,
        summary: `${input.payload.action} ${input.payload.mediaType}`,
        entityType: input.payload.target.includes("/person/") ? "person" : "title",
        entityId: input.payload.target,
      };
    case "awards_events":
      return {
        title: input.payload.originalName,
        summary: `${input.payload.eventType} · ${input.payload.officialUrl}`,
        entityType: "event",
        entityId: input.payload.officialUrl,
      };
    case "duplicate_titles":
      return {
        title: input.payload.primaryTitle,
        summary: `Duplicate: ${input.payload.duplicateTitle}`,
        entityType: "title",
        entityId: input.payload.primaryTitle,
      };
    case "merge_people":
      return {
        title: input.payload.primaryPerson,
        summary: `Merge ${input.payload.duplicatePeople.length} duplicate people`,
        entityType: "person",
        entityId: input.payload.primaryPerson,
      };
    case "split_person":
      return {
        title: input.payload.sourcePerson,
        summary: `Split ${input.payload.creditsToMove.length} credits`,
        entityType: "person",
        entityId: input.payload.sourcePerson,
      };
  }
}

function toContributionSubmission(row: typeof contributionSubmissions.$inferSelect): ContributionSubmission {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    entityType: row.entityType,
    entityId: row.entityId,
    payload: row.payload,
    status: row.status,
    reviewNote: row.reviewNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

contributionRoutes.post("/submissions", requireAuth, contributionSubmitRateLimit, async function (c) {
  var user = c.get("user");
  var idempotencyKey = cleanIdempotencyKey(c.req.header("Idempotency-Key"));
  var parsed = contributionSubmissionSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid contribution submission");
  }

  var input = parsed.data;
  var derived = deriveContributionSummary(input);
  var payload = input.payload as Record<string, unknown>;
  var source = firstSource(payload);
  var summary = derived.summary;
  if (source && !summary.includes(source)) summary = `${summary} · ${source}`;

  var inserted = await getWriteDb()
    .insert(contributionSubmissions)
    .values({
      userId: user.userId,
      kind: input.kind,
      title: derived.title,
      summary,
      entityType: derived.entityType,
      entityId: derived.entityId,
      payload,
      idempotencyKey,
    })
    .onConflictDoNothing()
    .returning();

  var row = inserted[0] ?? null;
  if (!row) {
    var existing = await getDb()
      .select()
      .from(contributionSubmissions)
      .where(
        and(
          eq(contributionSubmissions.userId, user.userId),
          eq(contributionSubmissions.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    row = existing[0] ?? null;
  }

  if (!row) throw badRequest("Contribution submission could not be saved");

  return c.json({ submission: toContributionSubmission(row) }, inserted.length > 0 ? 201 : 200);
});

contributionRoutes.get("/submissions", requireAuth, async function (c) {
  var user = c.get("user");
  var pagination = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor") || undefined,
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(pagination.cursor);
  var pageSize = pagination.limit;

  var rows = await getDb()
    .select()
    .from(contributionSubmissions)
    .where(
      and(
        eq(contributionSubmissions.userId, user.userId),
        eq(contributionSubmissions.isDeleted, false),
        cursor
          ? or(
              lt(contributionSubmissions.createdAt, cursor.createdAt),
              and(
                eq(contributionSubmissions.createdAt, cursor.createdAt),
                lt(contributionSubmissions.id, cursor.id)
              )
            )
          : undefined
      )
    )
    .orderBy(desc(contributionSubmissions.createdAt), desc(contributionSubmissions.id))
    .limit(pageSize + 1);

  var hasMore = rows.length > pageSize;
  var items = rows.slice(0, pageSize).map(toContributionSubmission);
  var last = rows[Math.min(rows.length, pageSize) - 1];

  var response: ContributionSubmissionPage = {
    items,
    hasMore,
    nextCursor: hasMore && last
      ? encodeCompositeCursor({ createdAt: last.createdAt, id: last.id })
      : null,
  };

  return c.json(response);
});
