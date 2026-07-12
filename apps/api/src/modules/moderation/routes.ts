import { Hono } from "hono";
import {
  createReportSchema,
  moderationActionPayloadSchema,
  moderationContentParamsSchema,
  moderationDetailQuerySchema,
  moderationDismissPayloadSchema,
  moderationQueueQuerySchema,
  moderationReportHistoryQuerySchema,
  moderationReportParamsSchema,
  moderationStrikeHistoryQuerySchema,
  moderationUserParamsSchema,
} from "@35mm/validators";
import { badRequest, forbidden } from "../../lib/errors.js";
import { requireAuth, type AuthUser } from "../../lib/middleware.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import { roleCanModerate, studioRoleForUser, type StudioRole } from "../../lib/studioAuth.js";
import { applyModerationAction, dismissModerationContent } from "./actions.js";
import {
  getModerationContentDetail,
  getModerationQueue,
  getModerationUserStrikes,
} from "./adminReadService.js";
import { createReport, getReportForUser, getReportsForUser } from "./reports.js";

export var moderationRoutes = new Hono();

export var moderationReportRateLimit = createRateLimitMiddleware({
  keyPrefix: "moderation:report",
  limit: 20,
  windowSeconds: 60 * 60,
  identify: identifyByUserId,
});

var moderationAdminMutationRateLimit = createRateLimitMiddleware({
  keyPrefix: "moderation:admin:mutation",
  limit: 60,
  windowSeconds: 60,
  identify: identifyByUserId,
});

function zodMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid moderation request";
}

async function moderationRoleFor(user: AuthUser): Promise<StudioRole> {
  var role = await studioRoleForUser(user, "moderation.auth", roleCanModerate);
  if (!roleCanModerate(role)) {
    throw forbidden("Moderation staff access is required");
  }
  return role;
}

function idempotencyKey(value: string | undefined): string {
  var key = value?.trim() ?? "";
  if (key.length < 8 || key.length > 120) {
    throw badRequest("Idempotency-Key must be 8-120 characters");
  }
  return key;
}

moderationRoutes.post("/reports", requireAuth, moderationReportRateLimit, async function (c) {
  var parsed = createReportSchema.safeParse(await c.req.json().catch(function () {
    return null;
  }));
  if (!parsed.success) throw badRequest(zodMessage(parsed.error));

  var user = c.get("user") as AuthUser;
  var result = await createReport(user.userId, parsed.data);
  return c.json({ report: result.report }, result.created ? 201 : 200);
});

moderationRoutes.get("/me/reports", requireAuth, async function (c) {
  var parsed = moderationReportHistoryQuerySchema.safeParse({
    cursor: c.req.query("cursor") || undefined,
    limit: c.req.query("limit"),
  });
  if (!parsed.success) throw badRequest(zodMessage(parsed.error));

  var user = c.get("user") as AuthUser;
  return c.json(await getReportsForUser({
    reporterUserId: user.userId,
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  }));
});

moderationRoutes.get("/me/reports/:reportId", requireAuth, async function (c) {
  var parsed = moderationReportParamsSchema.safeParse({
    reportId: c.req.param("reportId"),
  });
  if (!parsed.success) throw badRequest(zodMessage(parsed.error));

  var user = c.get("user") as AuthUser;
  return c.json(await getReportForUser({
    reporterUserId: user.userId,
    reportId: parsed.data.reportId,
  }));
});

moderationRoutes.get("/admin/moderation/queue", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await moderationRoleFor(user);
  var parsed = moderationQueueQuerySchema.safeParse({
    status: c.req.query("status") || undefined,
    contentType: c.req.query("contentType") || undefined,
    reason: c.req.query("reason") || undefined,
    cursor: c.req.query("cursor") || undefined,
    limit: c.req.query("limit"),
  });
  if (!parsed.success) throw badRequest(zodMessage(parsed.error));
  return c.json(await getModerationQueue(parsed.data));
});

moderationRoutes.get("/admin/moderation/content/:contentType/:contentId", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await moderationRoleFor(user);
  var params = moderationContentParamsSchema.safeParse({
    contentType: c.req.param("contentType"),
    contentId: c.req.param("contentId"),
  });
  if (!params.success) throw badRequest(zodMessage(params.error));
  var query = moderationDetailQuerySchema.safeParse({
    reportCursor: c.req.query("reportCursor") || undefined,
    actionCursor: c.req.query("actionCursor") || undefined,
    strikeCursor: c.req.query("strikeCursor") || undefined,
    limit: c.req.query("limit"),
  });
  if (!query.success) throw badRequest(zodMessage(query.error));
  return c.json(await getModerationContentDetail(
    params.data.contentType,
    params.data.contentId,
    query.data
  ));
});

moderationRoutes.post(
  "/admin/moderation/content/:contentType/:contentId/action",
  requireAuth,
  moderationAdminMutationRateLimit,
  async function (c) {
    var user = c.get("user") as AuthUser;
    var role = await moderationRoleFor(user);
    var params = moderationContentParamsSchema.safeParse({
      contentType: c.req.param("contentType"),
      contentId: c.req.param("contentId"),
    });
    if (!params.success) throw badRequest(zodMessage(params.error));
    var payload = moderationActionPayloadSchema.safeParse(await c.req.json().catch(function () {
      return null;
    }));
    if (!payload.success) throw badRequest(zodMessage(payload.error));
    var action = await applyModerationAction({
      ...params.data,
      actorUserId: user.userId,
      actorRole: role,
      idempotencyKey: idempotencyKey(c.req.header("Idempotency-Key")),
      payload: payload.data,
    });
    return c.json({ action });
  }
);

moderationRoutes.post(
  "/admin/moderation/content/:contentType/:contentId/dismiss",
  requireAuth,
  moderationAdminMutationRateLimit,
  async function (c) {
    var user = c.get("user") as AuthUser;
    var role = await moderationRoleFor(user);
    var params = moderationContentParamsSchema.safeParse({
      contentType: c.req.param("contentType"),
      contentId: c.req.param("contentId"),
    });
    if (!params.success) throw badRequest(zodMessage(params.error));
    var payload = moderationDismissPayloadSchema.safeParse(await c.req.json().catch(function () {
      return {};
    }));
    if (!payload.success) throw badRequest(zodMessage(payload.error));
    var action = await dismissModerationContent({
      ...params.data,
      actorUserId: user.userId,
      actorRole: role,
      idempotencyKey: idempotencyKey(c.req.header("Idempotency-Key")),
      payload: payload.data,
    });
    return c.json({ action });
  }
);

moderationRoutes.get("/admin/moderation/users/:userId/strikes", requireAuth, async function (c) {
  var user = c.get("user") as AuthUser;
  await moderationRoleFor(user);
  var params = moderationUserParamsSchema.safeParse({ userId: c.req.param("userId") });
  if (!params.success) throw badRequest(zodMessage(params.error));
  var query = moderationStrikeHistoryQuerySchema.safeParse({
    cursor: c.req.query("cursor") || undefined,
    limit: c.req.query("limit"),
  });
  if (!query.success) throw badRequest(zodMessage(query.error));
  return c.json(await getModerationUserStrikes({
    userId: params.data.userId,
    cursor: query.data.cursor,
    limit: query.data.limit,
  }));
});
