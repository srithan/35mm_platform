import { getR2ObjectKeyFromUrl } from "../media/url.js";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { and, desc, eq, isNotNull, lte, sql } from "drizzle-orm";
import { films, posts, profiles, videoAssets } from "@35mm/db/schema";
import {
  assertBunnyConfig,
  createBunnyVideo,
  playbackUrl,
  reconcileVideo,
  sha256,
  uploadCredentials,
  validWebhook,
  videoStatus,
  type VideoAsset,
} from "@35mm/db/video-service";
import {
  publishFilmSchema,
  videoUploadSchema,
  videoWebhookSchema,
} from "@35mm/validators";
import type { UploadedFilm } from "@35mm/types";
import { getDb, getWriteDb } from "../../lib/db.js";
import { loadEnv } from "../../lib/env.js";
import { getOptionalAuthUser, requireAuth } from "../../lib/middleware.js";
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  serviceUnavailable,
  unauthorized,
} from "../../lib/errors.js";
import { blockFiltersForAuthor } from "../../lib/moderation.js";
import {
  applyRateLimit,
  createRateLimitMiddleware,
  identifyByIp,
  identifyByUserId,
} from "../../lib/rateLimit.js";
import {
  decodeCompositeCursor,
  encodeCompositeCursor,
} from "../../lib/cursor.js";
import { createUlid, isValidUlid } from "../../lib/ulid.js";

export const videoRoutes = new Hono();
const writeLimit = createRateLimitMiddleware({
  keyPrefix: "video:write",
  limit: 20,
  windowSeconds: 60,
  identify: identifyByUserId,
});
const refreshLimit = createRateLimitMiddleware({
  keyPrefix: "video:refresh",
  limit: 12,
  windowSeconds: 60,
  identify: identifyByUserId,
});
const readLimit = createRateLimitMiddleware({
  keyPrefix: "video:read",
  limit: 120,
  windowSeconds: 60,
  identify: identifyByIp,
});
const webhookLimit = createRateLimitMiddleware({
  keyPrefix: "video:webhook",
  limit: 10000,
  windowSeconds: 60,
  identify: (c) => c.req.param("libraryId") ?? "bunny",
});
videoRoutes.use(
  "*",
  bodyLimit({
    maxSize: 32768,
    onError: (c) =>
      c.json(
        { code: "PAYLOAD_TOO_LARGE", message: "Video metadata is too large" },
        413,
      ),
  }),
);
videoRoutes.use("*", async (c, next) => {
  c.header("Cache-Control", "private, no-store");
  await next();
});
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assetId(id: string) {
  if (!UUID.test(id)) throw badRequest("Invalid video ID");
  return id;
}
function config() {
  const env = loadEnv();
  try {
    assertBunnyConfig(env);
  } catch {
    throw serviceUnavailable(
      "VIDEO_UNAVAILABLE",
      "Video uploads are not configured",
    );
  }
  return env;
}
async function ownedAsset(id: string, userId: string) {
  const [asset] = await getDb()
    .select()
    .from(videoAssets)
    .where(
      and(
        eq(videoAssets.id, assetId(id)),
        eq(videoAssets.userId, userId),
        eq(videoAssets.isDeleted, false),
      ),
    )
    .limit(1);
  if (!asset) throw notFound("Video not found");
  return asset;
}
function authorAccess(viewerId: string | null) {
  return viewerId
    ? and(
        ...blockFiltersForAuthor(viewerId, videoAssets.userId),
        sql`(${videoAssets.userId} = ${viewerId} or (${profiles.moderationStatus} = 'visible' and (${profiles.isPrivate} = false or exists(select 1 from follows where follower_id = ${viewerId} and following_id = ${videoAssets.userId} and status = 'accepted'))))`,
      )
    : and(
        eq(profiles.isPrivate, false),
        eq(profiles.moderationStatus, "visible"),
      );
}
function filmAccess(viewerId: string | null) {
  const released = and(
    isNotNull(videoAssets.publishedAt),
    lte(videoAssets.releaseAt, new Date()),
    sql`${videoAssets.visibility} in ('public','unlisted')`,
  );
  return viewerId
    ? sql`(${videoAssets.userId} = ${viewerId} or ${released})`
    : released;
}
function filmResponse(
  asset: VideoAsset,
  author: UploadedFilm["author"],
  viewerId: string | null,
): UploadedFilm {
  if (!asset.details || !asset.filmId || !asset.releaseAt)
    throw notFound("Film not found");
  return {
    ...asset.details,
    id: asset.filmId,
    assetId: asset.id,
    durationSeconds: asset.durationSeconds,
    visibility: asset.visibility,
    releaseAt: asset.releaseAt.toISOString(),
    author,
    isOwner: viewerId === asset.userId,
  };
}

videoRoutes.post("/uploads", requireAuth, writeLimit, async (c) => {
  const parsed = videoUploadSchema.safeParse(await c.req.json());
  if (!parsed.success)
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid upload");
  const input = parsed.data;
  const userId = c.get("user").userId;
  const env = config();
  const requestHash = sha256(JSON.stringify(input));
  const [prior] = await getDb()
    .select({ id: videoAssets.id })
    .from(videoAssets)
    .where(
      and(
        eq(videoAssets.userId, userId),
        eq(videoAssets.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  if (!prior) {
    const limited = await applyRateLimit(c, {
      keyPrefix: "video:daily",
      limit: 20,
      windowSeconds: 86400,
      identifier: userId,
    });
    if (limited) return limited;
  }
  const inserted = await getDb()
    .insert(videoAssets)
    .values({
      userId,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      purpose: input.purpose,
      filename: input.filename,
      contentType: input.contentType,
      declaredBytes: input.contentLength,
      libraryId: env.BUNNY_STREAM_LIBRARY_ID,
      nextCheckAt: new Date(Date.now() + 60_000),
    })
    .onConflictDoNothing({
      target: [videoAssets.userId, videoAssets.idempotencyKey],
    })
    .returning();
  let asset = inserted[0];
  if (asset) {
    try {
      const video = await createBunnyVideo(asset, env);
      const [updated] = await getDb()
        .update(videoAssets)
        .set({
          providerId: video.guid,
          state: "uploading",
          updatedAt: new Date(),
        })
        .where(
          and(eq(videoAssets.id, asset.id), eq(videoAssets.state, "creating")),
        )
        .returning();
      asset = updated ?? asset;
    } catch (error) {
      console.error("[video.create] initialization interrupted", {
        assetId: asset.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      throw serviceUnavailable(
        "VIDEO_INITIALIZING",
        "Video initialization is being checked. Retry this upload shortly.",
      );
    }
  } else {
    [asset] = await getDb()
      .select()
      .from(videoAssets)
      .where(
        and(
          eq(videoAssets.userId, userId),
          eq(videoAssets.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (!asset || asset.requestHash !== requestHash)
      throw conflict("Upload retry does not match its original request");
    if (asset.state === "creating")
      asset = await reconcileVideo(getDb(), asset, env);
  }
  if (asset.isDeleted || asset.state === "failed")
    throw conflict(asset.failureReason ?? "Upload is no longer available");
  if (!asset.providerId && asset.state !== "processing")
    throw conflict("Video is initializing. Retry shortly.");
  // Replays after completion return status only, never mint another upload grant.
  if (
    asset.state === "ready" ||
    asset.state === "processing" ||
    asset.postId ||
    asset.publishedAt
  )
    return c.json(videoStatus(asset));
  if (asset.createdAt.getTime() + 86400000 <= Date.now())
    throw conflict("Upload session expired. Select the file again.");
  return c.json(
    { ...videoStatus(asset), ...uploadCredentials(asset, env) },
    inserted.length ? 201 : 200,
  );
});

videoRoutes.post("/:id/complete", requireAuth, writeLimit, async (c) => {
  const asset = await ownedAsset(c.req.param("id"), c.get("user").userId);
  const [updated] = await getDb()
    .update(videoAssets)
    .set({
      state: "processing",
      nextCheckAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(videoAssets.id, asset.id), eq(videoAssets.state, "uploading"), eq(videoAssets.isDeleted, false)),
    ).returning();
  return c.json(videoStatus(updated ?? await ownedAsset(asset.id, c.get("user").userId)));
});
videoRoutes.get("/:id/status", requireAuth, readLimit, async (c) =>
  c.json(
    videoStatus(await ownedAsset(c.req.param("id"), c.get("user").userId)),
  ),
);
videoRoutes.post("/:id/refresh", requireAuth, refreshLimit, async (c) => {
  const asset = await ownedAsset(c.req.param("id"), c.get("user").userId);
  try {
    return c.json(videoStatus(await reconcileVideo(getDb(), asset, config())));
  } catch (error) {
    console.error("[video.refresh] failed", {
      assetId: asset.id,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw serviceUnavailable(
      "VIDEO_STATUS_UNAVAILABLE",
      "Could not check video processing. Please retry.",
    );
  }
});
const authenticateWebhook: MiddlewareHandler = async (c, next) => {
  const env = config();
  if (
    c.req.param("libraryId") !== env.BUNNY_STREAM_LIBRARY_ID ||
    !validWebhook(await c.req.text(), c.req.raw.headers, env)
  )
    throw unauthorized("Invalid webhook signature");
  await next();
};
videoRoutes.post(
  "/webhook/:libraryId",
  authenticateWebhook,
  webhookLimit,
  async (c) => {
    const env = config();
    const raw = await c.req.text();
    if (
      c.req.param("libraryId") !== env.BUNNY_STREAM_LIBRARY_ID ||
      !validWebhook(raw, c.req.raw.headers, env)
    )
      throw unauthorized("Invalid webhook signature");
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw badRequest("Invalid webhook JSON");
    }
    const parsed = videoWebhookSchema.safeParse(value);
    if (
      !parsed.success ||
      String(parsed.data.VideoLibraryId) !== env.BUNNY_STREAM_LIBRARY_ID
    )
      throw badRequest("Invalid webhook payload");
    const [asset] = await getDb()
      .select()
      .from(videoAssets)
      .where(
        and(
          eq(videoAssets.libraryId, env.BUNNY_STREAM_LIBRARY_ID),
          eq(videoAssets.providerId, parsed.data.VideoGuid),
        ),
      )
      .limit(1);
    // Treat events as hints. Provider lookup and its lease defeat duplicate/out-of-order events.
    if (asset) await reconcileVideo(getDb(), asset, env);
    return c.json({ ok: true });
  },
);

videoRoutes.get("/films", readLimit, async (c) => {
  const viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  const viewerId = viewer?.userId ?? null;
  const mine = c.req.query("mine") === "true";
  if (mine && !viewerId) throw unauthorized("Sign in to view your films");
  const limit = Number(c.req.query("limit") ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 40)
    throw badRequest("Limit must be between 1 and 40");
  const cursorRaw = c.req.query("cursor");
  if (cursorRaw && cursorRaw.length > 300) throw badRequest("Invalid cursor");
  const cursor = decodeCompositeCursor(cursorRaw);
  if (cursor) assetId(cursor.id);
  const rows = await getDb()
    .select({
      asset: videoAssets,
      author: {
        id: profiles.userId,
        username: profiles.username,
        displayName: profiles.displayName,
      },
    })
    .from(videoAssets)
    .innerJoin(profiles, eq(profiles.userId, videoAssets.userId))
    .where(
      and(
        eq(videoAssets.purpose, "film"),
        eq(videoAssets.state, "ready"),
        eq(videoAssets.isDeleted, false),
        isNotNull(videoAssets.publishedAt),
        mine
          ? eq(videoAssets.userId, viewerId!)
          : and(
              eq(videoAssets.visibility, "public"),
              lte(videoAssets.releaseAt, new Date()),
              authorAccess(viewerId),
            ),
        cursor
          ? sql`(${videoAssets.releaseAt}, ${videoAssets.id}) < (${cursor.createdAt}, ${cursor.id}::uuid)`
          : undefined,
      ),
    )
    .orderBy(desc(videoAssets.releaseAt), desc(videoAssets.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1)?.asset;
  const hasMore = rows.length > limit;
  return c.json({
    items: page.map((row) => filmResponse(row.asset, row.author, viewerId)),
    hasMore,
    nextCursor:
      hasMore && last?.releaseAt
        ? encodeCompositeCursor({ createdAt: last.releaseAt, id: last.id })
        : null,
  });
});
videoRoutes.get("/films/:filmId", readLimit, async (c) => {
  const id = c.req.param("filmId");
  if (!isValidUlid(id)) throw badRequest("Invalid film ID");
  const viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  const viewerId = viewer?.userId ?? null;
  const [row] = await getDb()
    .select({
      asset: videoAssets,
      author: {
        id: profiles.userId,
        username: profiles.username,
        displayName: profiles.displayName,
      },
    })
    .from(videoAssets)
    .innerJoin(profiles, eq(profiles.userId, videoAssets.userId))
    .where(
      and(
        eq(videoAssets.filmId, id),
        eq(videoAssets.isDeleted, false),
        eq(videoAssets.state, "ready"),
        authorAccess(viewerId),
        filmAccess(viewerId),
      ),
    )
    .limit(1);
  if (!row) throw notFound("Film not found");
  return c.json(filmResponse(row.asset, row.author, viewerId));
});
videoRoutes.post("/:id/publish", requireAuth, writeLimit, async (c) => {
  const parsed = publishFilmSchema.safeParse(await c.req.json());
  if (!parsed.success)
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid film details");
  const input = parsed.data;
  const id = assetId(c.req.param("id"));
  const userId = c.get("user").userId;
  if (input.thumbnailUrl) {
    const key = getR2ObjectKeyFromUrl(input.thumbnailUrl);
    if (!key?.startsWith(`users/${userId}/post_media/`))
      throw forbidden("Use a thumbnail uploaded to your account");
  }
  const filmId = await getWriteDb().transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(videoAssets)
      .where(
        and(
          eq(videoAssets.id, id),
          eq(videoAssets.userId, userId),
          eq(videoAssets.isDeleted, false),
        ),
      )
      .limit(1)
      .for("update");
    if (!asset) throw notFound("Video not found");
    if (asset.purpose !== "film" || asset.state !== "ready")
      throw conflict("Wait for film processing to finish before publishing");
    if (asset.filmId) return asset.filmId;
    const { visibility, releaseAt, ...details } = input;
    const canonicalId = createUlid();
    await tx
      .insert(films)
      .values({
        id: canonicalId,
        title: input.title,
        overview: input.description,
        year: input.year,
        runtime: Math.ceil((asset.durationSeconds ?? 0) / 60),
        genres: input.genres,
        director: input.director,
        language: input.language,
        country: input.country,
        source: "user_contributed",
        contributedByUserId: userId,
        isCatalogListed: false,
      });
    await tx
      .update(videoAssets)
      .set({
        filmId: canonicalId,
        details,
        visibility,
        publishedAt: new Date(),
        releaseAt: releaseAt ? new Date(releaseAt) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(videoAssets.id, id));
    return canonicalId;
  });
  return c.json({ filmId }, 201);
});
videoRoutes.delete("/:id", requireAuth, writeLimit, async (c) => {
  const id = assetId(c.req.param("id"));
  await getWriteDb().transaction(async (tx) => {
    const [asset] = await tx
      .select()
      .from(videoAssets)
      .where(
        and(
          eq(videoAssets.id, id),
          eq(videoAssets.userId, c.get("user").userId),
        ),
      )
      .limit(1)
      .for("update");
    if (!asset) throw notFound("Video not found");
    if (asset.postId)
      throw conflict("Delete the attached post to remove this video");
    await tx
      .update(videoAssets)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(videoAssets.id, id));
  });
  return c.json({ ok: true });
});
videoRoutes.get("/:id/playback", readLimit, async (c) => {
  const viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  const viewerId = viewer?.userId ?? null;
  const [asset] = await getDb()
    .select({ asset: videoAssets })
    .from(videoAssets)
    .innerJoin(profiles, eq(profiles.userId, videoAssets.userId))
    .where(
      and(
        eq(videoAssets.id, assetId(c.req.param("id"))),
        eq(videoAssets.isDeleted, false),
        authorAccess(viewerId),
      ),
    )
    .limit(1);
  if (!asset) throw notFound("Video not found");
  const video = asset.asset;
  if (video.postId) {
    const [post] = await getDb()
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.id, video.postId),
          eq(posts.isDeleted, false),
          sql`(${posts.moderationStatus} = 'visible' or ${posts.userId} = ${viewerId})`,
          sql`(${posts.visibility} = 'public' or ${posts.userId} = ${viewerId} or (${posts.visibility} = 'followers_only' and exists(select 1 from follows where follower_id = ${viewerId} and following_id = ${posts.userId} and status = 'accepted')))`,
          sql`${posts.media} @> ${JSON.stringify([{ videoAssetId: video.id }])}::jsonb`,
        ),
      )
      .limit(1);
    if (!post) throw notFound("Video not found");
  } else if (
    video.userId !== viewerId &&
    (!video.publishedAt ||
      !video.releaseAt ||
      video.releaseAt.getTime() > Date.now() ||
      video.visibility === "private")
  ) {
    throw notFound("Video not found");
  }
  if (video.state !== "ready") {
    return c.json({
      state: video.state === "failed" ? "failed" : "processing",
      message: video.state === "failed"
        ? "Video processing failed. The uploader needs to upload the video again."
        : "Video processing. Playback will appear when it is ready.",
      width: video.width,
      height: video.height,
    });
  }
  return c.json(playbackUrl(video, config()));
});
