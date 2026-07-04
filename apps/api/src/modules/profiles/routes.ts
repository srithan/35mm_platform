import { Hono } from "hono";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { users, profiles, follows, profileFollowApprovalOutbox } from "@35mm/db/schema";
import { getDb, getWriteDb } from "../../lib/db.js";
import { getModerationStatus, notBlockedWithViewerSql } from "../../lib/moderation.js";
import { requireAuth, getOptionalAuthUser } from "../../lib/middleware.js";
import { notFound, badRequest, forbidden, serviceUnavailable } from "../../lib/errors.js";
import {
  invalidateAuthorProfileFeedCaches,
  invalidateFeedCacheForGuest,
  invalidateViewerFeedCaches,
} from "../../lib/feedCache.js";
import { enqueueCounterOutboxDrainJob, enqueueMediaProcessJob } from "../../lib/jobs.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { cursorPaginationSchema, updateProfileSchema } from "@35mm/validators";
import {
  getR2ObjectKeyFromUrl,
  isR2ConfiguredPublicUrl,
  resolveProfileAvatarUrl,
  resolveProfileCoverUrl,
  type AvatarVariants,
  type CoverVariants,
} from "../media/url.js";

export var profileRoutes = new Hono();
type FollowState = "none" | "requested" | "following" | "self";

var profileWriteRateLimit = createRateLimitMiddleware({
  keyPrefix: "profiles:write",
  limit: 30,
  windowSeconds: 60,
  identify: identifyByUserId,
});

function isR2Url(value: string): boolean {
  return isR2ConfiguredPublicUrl(value);
}

async function resolveProfileMedia(
  userId: string,
  avatarUrl: string | null,
  coverUrl: string | null,
  avatarVariants?: AvatarVariants | null,
  coverVariants?: CoverVariants | null
) {
  var [resolvedAvatarUrl, resolvedAvatarUrlLg, resolvedCoverUrl] = await Promise.all([
    resolveProfileAvatarUrl(avatarUrl, userId, avatarVariants, "sm"),
    resolveProfileAvatarUrl(avatarUrl, userId, avatarVariants, "lg"),
    resolveProfileCoverUrl(coverUrl, userId, coverVariants),
  ]);

  return {
    avatarUrl: resolvedAvatarUrl,
    avatarUrlLg: resolvedAvatarUrlLg,
    coverUrl: resolvedCoverUrl,
  };
}

async function enqueueProfileMediaProcess(
  userId: string,
  kind: "avatar" | "cover",
  mediaUrl: string | null | undefined
) {
  if (!mediaUrl) return;
  var objectKey = getR2ObjectKeyFromUrl(mediaUrl);
  if (!objectKey) return;
  try {
    var queued = await enqueueMediaProcessJob({ kind, userId, objectKey });
    if (!queued) {
      console.warn("[media-process] queue disabled for profile media", {
        userId,
        kind,
        objectKey,
      });
    }
  } catch (error) {
    console.error("[media-process] failed to enqueue profile media", {
      userId,
      kind,
      objectKey,
      error,
    });
  }
}

async function resolveTargetByUsername(username: string) {
  var db = getDb();
  var rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Profile not found");
  }

  return rows[0].userId;
}

function followStateFromStatus(viewerUserId: string | null, profileUserId: string, status: "pending" | "accepted" | null): FollowState {
  if (viewerUserId && viewerUserId === profileUserId) return "self";
  if (status === "accepted") return "following";
  if (status === "pending") return "requested";
  return "none";
}

profileRoutes.get("/search", requireAuth, async function (c) {
  var user = c.get("user");
  var q = (c.req.query("q") ?? "").trim().toLowerCase();
  var limitRaw = Number(c.req.query("limit") ?? 8);
  var limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 8) : 8;
  var db = getDb();

  var searchFilter =
    q.length === 0
      ? sql<boolean>`true`
      : sql<boolean>`(
          lower(${profiles.username}) like ${q + "%"}
          or lower(${profiles.displayName}) like ${"%" + q + "%"}
        )`;

  var rows = await db
    .select({
      id: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      isPrivate: profiles.isPrivate,
      followStatus: sql<"pending" | "accepted" | null>`(
        select ${follows.status}
        from ${follows}
        where ${follows.followerId} = ${user.userId}
          and ${follows.followingId} = ${profiles.userId}
        limit 1
      )`,
      isFollowing: sql<boolean>`exists(
        select 1 from ${follows}
        where ${follows.followerId} = ${user.userId}
          and ${follows.followingId} = ${profiles.userId}
          and ${follows.status} = 'accepted'
      )`,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(
      and(
        eq(users.status, "active"),
        searchFilter,
        notBlockedWithViewerSql(user.userId, profiles.userId)
      )
    )
    .orderBy(
      sql`case when exists(
        select 1 from ${follows}
        where ${follows.followerId} = ${user.userId}
          and ${follows.followingId} = ${profiles.userId}
          and ${follows.status} = 'accepted'
      ) then 0 else 1 end`,
      profiles.username
    )
    .limit(limit);

  return c.json({
    users: await Promise.all(
      rows.map(async function (row) {
        return {
          id: row.id,
          username: row.username,
          displayName: row.displayName,
	          avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.id, row.avatarVariants, "sm"),
	          avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.id, row.avatarVariants, "lg"),
	          isPrivate: Boolean(row.isPrivate),
	          followState: followStateFromStatus(user.userId, row.id, row.followStatus),
	          isFollowing: Boolean(row.isFollowing),
	        };
	      })
    ),
  });
});

function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  var parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

profileRoutes.get("/:username", async function (c) {
  var username = c.req.param("username").toLowerCase().trim();
  var db = getDb();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));

  var rows = await db
    .select({
      userId: users.id,
      username: profiles.username,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      coverUrl: profiles.coverUrl,
      coverVariants: profiles.coverVariants,
      location: profiles.location,
      website: profiles.website,
      dateOfBirth: profiles.dateOfBirth,
      role: profiles.role,
      roleContext: profiles.roleContext,
      headline: profiles.headline,
      headlineContext: profiles.headlineContext,
      isPrivate: profiles.isPrivate,
      filmsLoggedCount: profiles.filmsLoggedCount,
      followerCount: profiles.followerCount,
      followingCount: profiles.followingCount,
      status: users.status,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.username, username))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Profile not found");
  }

  var row = rows[0];

  var isMutedByViewer = false;

  if (viewer) {
    var moderation = await getModerationStatus(viewer.userId, row.userId);
    isMutedByViewer = moderation.isMutedByViewer;

    if (moderation.blockedByViewer || moderation.blockedByTarget) {
      return c.json(
        {
          code: "BLOCKED",
          message: moderation.blockedByViewer ? `BLOCKED_BY_YOU:${row.userId}` : "BLOCKED_BY_THEM",
        },
        403
      );
    }
  }

  var [
    followRelationRows,
    incomingFollowRequestRows,
  ] = await Promise.all([
    viewer
      ? db
          .select({ status: follows.status })
          .from(follows)
          .where(and(eq(follows.followerId, viewer.userId), eq(follows.followingId, row.userId)))
          .limit(1)
      : Promise.resolve([] as Array<{ status: "pending" | "accepted" }>),
    viewer && viewer.userId !== row.userId
      ? db
          .select({ followerId: follows.followerId })
          .from(follows)
          .where(
            and(
              eq(follows.followerId, row.userId),
              eq(follows.followingId, viewer.userId),
              eq(follows.status, "pending")
            )
          )
          .limit(1)
      : Promise.resolve([] as Array<{ followerId: string }>),
  ]);

  var followerCount = Number(row.followerCount ?? 0);
  var followingCount = Number(row.followingCount ?? 0);
  var followStatus = followRelationRows[0]?.status ?? null;
  var followState = followStateFromStatus(viewer?.userId ?? null, row.userId, followStatus);
  var isFollowing = followState === "following";
  var hasIncomingFollowRequest = incomingFollowRequestRows.length > 0;
  var hasPendingRequestToViewer = hasIncomingFollowRequest;
  var isOwner = viewer?.userId === row.userId;

  if (row.status === "deactivated") {
    return c.json({
      username: row.username,
      displayName: "Deactivated Account",
      bio: null,
      avatarUrl: null,
      avatarUrlLg: null,
      coverUrl: null,
      location: null,
      website: null,
      dateOfBirth: null,
      role: null,
      roleContext: null,
      headline: null,
      headlineContext: null,
	      filmsLoggedCount: 0,
	      followerCount,
	      followingCount,
	      followState,
	      isPrivate: false,
	      hasIncomingFollowRequest,
	      hasPendingRequestToViewer,
	      isDeactivated: true,
	    });
	  }

  var media = await resolveProfileMedia(
    row.userId,
    row.avatarUrl,
    row.coverUrl,
    row.avatarVariants,
    row.coverVariants
  );

  if (row.isPrivate && !isOwner && !isFollowing) {
    return c.json({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      bio: row.bio,
      avatarUrl: media.avatarUrl,
      avatarUrlLg: media.avatarUrlLg,
      coverUrl: media.coverUrl,
      location: row.location,
      website: row.website,
      dateOfBirth: isOwner ? row.dateOfBirth : null,
      role: row.role,
      roleContext: row.roleContext,
      headline: row.headline,
      headlineContext: row.headlineContext,
	      filmsLoggedCount: row.filmsLoggedCount,
	      followerCount,
	      followingCount,
	      followState,
	      isPrivate: true,
	      hasIncomingFollowRequest,
	      hasPendingRequestToViewer,
	      isDeactivated: false,
	      isMutedByViewer,
	      createdAt: row.createdAt.toISOString(),
    });
  }

  return c.json({
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl: media.avatarUrl,
    avatarUrlLg: media.avatarUrlLg,
    coverUrl: media.coverUrl,
    location: row.location,
    website: row.website,
    dateOfBirth: isOwner ? row.dateOfBirth : null,
    role: row.role,
    roleContext: row.roleContext,
    headline: row.headline,
    headlineContext: row.headlineContext,
	    filmsLoggedCount: row.filmsLoggedCount,
	    followerCount,
	    followingCount,
	    followState,
	    isPrivate: row.isPrivate,
	    hasIncomingFollowRequest,
	    hasPendingRequestToViewer,
	    isDeactivated: false,
	    isMutedByViewer,
	    createdAt: row.createdAt.toISOString(),
  });
});

function dedupeStrings(values: string[]): string[] {
  var seen = new Set<string>();
  var out: string[] = [];
  for (var value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function normalizeRole(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase();
}

function profileUpdateSetChunks(updates: Record<string, any>): Record<string, any> {
  var chunks: Record<string, any> = {};

  if ("displayName" in updates) chunks.displayName = updates.displayName;
  if ("bio" in updates) chunks.bio = updates.bio;
  if ("location" in updates) chunks.location = updates.location;
  if ("website" in updates) chunks.website = updates.website;
  if ("dateOfBirth" in updates) chunks.dateOfBirth = updates.dateOfBirth;
  if ("role" in updates) chunks.role = updates.role;
  if ("roleContext" in updates) chunks.roleContext = updates.roleContext;
  if ("isPrivate" in updates) chunks.isPrivate = updates.isPrivate;
  if ("headline" in updates) chunks.headline = updates.headline;
  if ("headlineContext" in updates) chunks.headlineContext = updates.headlineContext;
  if ("favoriteFilmIds" in updates) chunks.favoriteFilmIds = updates.favoriteFilmIds;
  if ("favoriteGenreIds" in updates) chunks.favoriteGenreIds = updates.favoriteGenreIds;
  if ("avatarUrl" in updates) chunks.avatarUrl = updates.avatarUrl;
  if ("avatarVariants" in updates) chunks.avatarVariants = updates.avatarVariants;
  if ("coverUrl" in updates) chunks.coverUrl = updates.coverUrl;
  if ("coverVariants" in updates) chunks.coverVariants = updates.coverVariants;
  if ("updatedAt" in updates) chunks.updatedAt = updates.updatedAt;

  return chunks;
}

profileRoutes.patch("/me", requireAuth, profileWriteRateLimit, async function (c) {
  var user = c.get("user");
  var body = updateProfileSchema.parse(await c.req.json());
  var db = getWriteDb();

  var updates: Record<string, any> = {};

  if (body.displayName !== undefined) {
    var name = String(body.displayName).trim();
    if (name.length < 1 || name.length > 100) {
      throw badRequest("Display name must be 1-100 characters");
    }
    updates.displayName = name;
  }

  if (body.bio !== undefined) {
    updates.bio = String(body.bio).slice(0, 500);
  }

  if (body.location !== undefined) {
    updates.location = body.location ? String(body.location).slice(0, 100) : null;
  }

  if (body.website !== undefined) {
    updates.website = body.website ? String(body.website).slice(0, 200) : null;
  }

  if (body.dateOfBirth !== undefined) {
    if (body.dateOfBirth === null || body.dateOfBirth === "") {
      updates.dateOfBirth = null;
    } else {
      var dateOfBirth = String(body.dateOfBirth).trim();
      if (!isValidDateOnly(dateOfBirth)) {
        throw badRequest("Date of birth must be a valid date in YYYY-MM-DD format");
      }
      updates.dateOfBirth = dateOfBirth;
    }
  }

  if (body.role !== undefined) {
    updates.role = body.role ? String(body.role).slice(0, 50) : null;
  }

  if (body.roleContext !== undefined) {
    updates.roleContext = body.roleContext ? String(body.roleContext).slice(0, 200) : null;
  }

  var requestedIsPrivate = body.isPrivate !== undefined ? Boolean(body.isPrivate) : undefined;
  if (requestedIsPrivate !== undefined) {
    updates.isPrivate = requestedIsPrivate;
  }

  if (body.headline !== undefined) {
    var headline = body.headline ? String(body.headline).trim() : "";
    updates.headline = headline.length > 0 ? headline.slice(0, 50) : null;
  }

  if (body.favoriteFilmIds !== undefined) {
    updates.favoriteFilmIds = dedupeStrings(
      body.favoriteFilmIds
        .map(function (filmId) {
          return filmId.trim();
        })
        .filter(Boolean)
    );
  }

  if (body.favoriteGenreIds !== undefined) {
    updates.favoriteGenreIds = dedupeStrings(
      body.favoriteGenreIds
        .map(function (genreId) {
          return genreId.trim();
        })
        .filter(Boolean)
    );
  }

  if (body.headlineContext !== undefined) {
    var roleForHeadlineContext: string | null = null;
    if (updates.role !== undefined) {
      roleForHeadlineContext = updates.role;
    } else {
      var roleRows = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.userId, user.userId))
        .limit(1);
      if (roleRows.length === 0) throw notFound("Profile not found");
      roleForHeadlineContext = roleRows[0].role;
    }

    var headlineContext = body.headlineContext ? String(body.headlineContext).trim() : "";
    if (normalizeRole(roleForHeadlineContext) === "cinephile") {
      throw badRequest("headlineContext is only valid when role is not cinephile");
    }
    updates.headlineContext = headlineContext.length > 0 ? headlineContext.slice(0, 25) : null;
  }

  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl === null || body.avatarUrl === "") {
      updates.avatarUrl = null;
      updates.avatarVariants = null;
    } else if (typeof body.avatarUrl === "string" && isR2Url(body.avatarUrl)) {
      updates.avatarUrl = body.avatarUrl;
      updates.avatarVariants = null;
    } else {
      return c.json({ code: "BAD_MEDIA_URL", message: "Invalid avatar URL" }, 400);
    }
  }

  if (body.coverUrl !== undefined) {
    if (body.coverUrl === null || body.coverUrl === "") {
      updates.coverUrl = null;
      updates.coverVariants = null;
    } else if (typeof body.coverUrl === "string" && isR2Url(body.coverUrl)) {
      updates.coverUrl = body.coverUrl;
      updates.coverVariants = null;
    } else {
      return c.json({ code: "BAD_MEDIA_URL", message: "Invalid cover URL" }, 400);
    }
  }

  if (Object.keys(updates).length === 0) {
    var existingRows = await db
      .select({
        userId: profiles.userId,
        username: profiles.username,
        displayName: profiles.displayName,
        bio: profiles.bio,
        avatarUrl: profiles.avatarUrl,
        avatarVariants: profiles.avatarVariants,
        coverUrl: profiles.coverUrl,
        coverVariants: profiles.coverVariants,
        location: profiles.location,
        website: profiles.website,
        dateOfBirth: profiles.dateOfBirth,
        role: profiles.role,
        roleContext: profiles.roleContext,
        isPrivate: profiles.isPrivate,
        headline: profiles.headline,
        headlineContext: profiles.headlineContext,
        favoriteFilmIds: profiles.favoriteFilmIds,
        favoriteGenreIds: profiles.favoriteGenreIds,
      })
      .from(profiles)
      .where(eq(profiles.userId, user.userId))
      .limit(1);

    if (existingRows.length === 0) throw notFound("Profile not found");

    var media = await resolveProfileMedia(
      existingRows[0].userId,
      existingRows[0].avatarUrl,
      existingRows[0].coverUrl,
      existingRows[0].avatarVariants,
      existingRows[0].coverVariants
    );

    return c.json({
      ok: true,
      message: "No changes",
      profile: {
        ...existingRows[0],
        avatarUrl: media.avatarUrl,
        avatarUrlLg: media.avatarUrlLg,
        coverUrl: media.coverUrl,
      },
    });
  }

  updates.updatedAt = new Date();

  if (requestedIsPrivate === false) {
    var currentRows = await db
      .select({ isPrivate: profiles.isPrivate })
      .from(profiles)
      .where(eq(profiles.userId, user.userId))
      .limit(1);
    if (currentRows.length === 0) throw notFound("Profile not found");

    if (currentRows[0].isPrivate) {
      var woken = await enqueueCounterOutboxDrainJob();
      if (!woken) {
        throw serviceUnavailable(
          "PROFILE_FOLLOW_APPROVAL_QUEUE_UNAVAILABLE",
          "Profile follow approval queue is unavailable; retry this request"
        );
      }

      await db.transaction(async function (tx) {
        await tx
          .update(profiles)
          .set(profileUpdateSetChunks(updates))
          .where(eq(profiles.userId, user.userId));

        await tx
          .insert(profileFollowApprovalOutbox)
          .values({
            targetUserId: user.userId,
            cursor: null,
            status: "pending",
          })
          .onConflictDoUpdate({
            target: profileFollowApprovalOutbox.targetUserId,
            set: {
              cursor: null,
              status: "pending",
              attempts: 0,
              lockedAt: null,
              nextAttemptAt: new Date(),
              lastError: null,
              updatedAt: new Date(),
            },
          });
      });
    } else {
      await db
        .update(profiles)
        .set(updates)
        .where(eq(profiles.userId, user.userId));
    }
  } else {
    await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.userId, user.userId));
  }

  var updated = await db
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      coverUrl: profiles.coverUrl,
      coverVariants: profiles.coverVariants,
      location: profiles.location,
      website: profiles.website,
      dateOfBirth: profiles.dateOfBirth,
      role: profiles.role,
      roleContext: profiles.roleContext,
      isPrivate: profiles.isPrivate,
      headline: profiles.headline,
      headlineContext: profiles.headlineContext,
      favoriteFilmIds: profiles.favoriteFilmIds,
      favoriteGenreIds: profiles.favoriteGenreIds,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  if (updated.length === 0) {
    throw notFound("Profile not found");
  }

  var media = await resolveProfileMedia(
    updated[0].userId,
    updated[0].avatarUrl,
    updated[0].coverUrl,
    updated[0].avatarVariants,
    updated[0].coverVariants
  );

  await Promise.all([
    typeof body.avatarUrl === "string" && body.avatarUrl.trim().length > 0
      ? enqueueProfileMediaProcess(user.userId, "avatar", body.avatarUrl)
      : Promise.resolve(),
    typeof body.coverUrl === "string" && body.coverUrl.trim().length > 0
      ? enqueueProfileMediaProcess(user.userId, "cover", body.coverUrl)
      : Promise.resolve(),
  ]);

  if (body.isPrivate !== undefined) {
    await invalidateAuthorProfileFeedCaches([user.userId]);
    await invalidateViewerFeedCaches([user.userId]);
    await invalidateFeedCacheForGuest();
  }

  return c.json({
    ok: true,
    profile: {
      ...updated[0],
      avatarUrl: media.avatarUrl,
      avatarUrlLg: media.avatarUrlLg,
      coverUrl: media.coverUrl,
    },
  });
});

profileRoutes.get("/:username/followers", async function (c) {
  var username = c.req.param("username").toLowerCase().trim();
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var followingId = await resolveTargetByUsername(username);
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var db = getDb();

  var cursorFilter = cursor
    ? or(
        lt(follows.createdAt, cursor.createdAt),
        and(eq(follows.createdAt, cursor.createdAt), lt(follows.followerId, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      createdAt: follows.createdAt,
      cursorId: follows.followerId,
    })
    .from(follows)
    .innerJoin(profiles, eq(profiles.userId, follows.followerId))
    .where(
      and(
        eq(follows.followingId, followingId),
        eq(follows.status, "accepted"),
        cursorFilter,
        viewer ? notBlockedWithViewerSql(viewer.userId, profiles.userId) : undefined
      )
    )
    .orderBy(desc(follows.createdAt), desc(follows.followerId))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(
    visibleRows.map(async function (row) {
      return {
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "sm"),
        avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "lg"),
        followedAt: row.createdAt.toISOString(),
      };
    })
  );

  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.createdAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

profileRoutes.get("/:username/following", async function (c) {
  var username = c.req.param("username").toLowerCase().trim();
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var followerId = await resolveTargetByUsername(username);
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var db = getDb();

  var cursorFilter = cursor
    ? or(
        lt(follows.createdAt, cursor.createdAt),
        and(eq(follows.createdAt, cursor.createdAt), lt(follows.followingId, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      createdAt: follows.createdAt,
      cursorId: follows.followingId,
    })
    .from(follows)
    .innerJoin(profiles, eq(profiles.userId, follows.followingId))
    .where(
      and(
        eq(follows.followerId, followerId),
        eq(follows.status, "accepted"),
        cursorFilter,
        viewer ? notBlockedWithViewerSql(viewer.userId, profiles.userId) : undefined
      )
    )
    .orderBy(desc(follows.createdAt), desc(follows.followingId))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(
    visibleRows.map(async function (row) {
      return {
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "sm"),
        avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "lg"),
        followedAt: row.createdAt.toISOString(),
      };
    })
  );

  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.createdAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

profileRoutes.get("/:username/follow-requests", requireAuth, async function (c) {
  var username = c.req.param("username").toLowerCase().trim();
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var viewer = c.get("user");
  var followingId = await resolveTargetByUsername(username);
  if (viewer.userId !== followingId) {
    throw forbidden("Cannot view follow requests for another account");
  }

  var db = getDb();
  var cursorFilter = cursor
    ? or(
        lt(follows.createdAt, cursor.createdAt),
        and(eq(follows.createdAt, cursor.createdAt), lt(follows.followerId, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      createdAt: follows.createdAt,
      cursorId: follows.followerId,
    })
    .from(follows)
    .innerJoin(profiles, eq(profiles.userId, follows.followerId))
    .where(
      and(
        eq(follows.followingId, followingId),
        eq(follows.status, "pending"),
        cursorFilter
      )
    )
    .orderBy(desc(follows.createdAt), desc(follows.followerId))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(
    visibleRows.map(async function (row) {
      return {
        userId: row.userId,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "sm"),
        avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "lg"),
        followedAt: row.createdAt.toISOString(),
      };
    })
  );

  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.createdAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});
