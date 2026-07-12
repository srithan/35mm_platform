import { Hono } from "hono";
import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { users, profiles, follows, profileFollowApprovalOutbox, posts, films } from "@35mm/db/schema";
import { getDb, getWriteDb } from "../../lib/db.js";
import { getModerationStatus, notBlockedWithViewerSql } from "../../lib/moderation.js";
import { requireAuth, getOptionalAuthUser } from "../../lib/middleware.js";
import { notFound, badRequest, forbidden, serviceUnavailable } from "../../lib/errors.js";
import {
  getProfileStatsCache,
  invalidateProfileStatsCaches,
  profileStatsCacheKey,
  setProfileStatsCache,
  type ProfileStatsCachePayload,
} from "../../lib/profileStatsCache.js";
import {
  invalidateAuthorProfileFeedCaches,
  invalidateFeedCacheForGuest,
  invalidateViewerFeedCaches,
} from "../../lib/feedCache.js";
import { enqueueCounterOutboxDrainJob, enqueueMediaProcessJob } from "../../lib/jobs.js";
import { createRateLimitMiddleware, identifyByUserId } from "../../lib/rateLimit.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import {
  isModerationProfileStatsDirty,
  isModerationStaffViewer,
  moderationReadAccessSql,
} from "../../lib/moderationRead.js";
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

async function resolveTargetByUsername(
  username: string,
  viewerUserId: string | null,
  viewerIsStaff: boolean
) {
  var db = getDb();
  var rows = await db
    .select({
      userId: profiles.userId,
      moderationStatus: profiles.moderationStatus,
    })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Profile not found");
  }

  if (
    rows[0].moderationStatus !== "visible" &&
    rows[0].userId !== viewerUserId &&
    !viewerIsStaff
  ) {
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
  var viewerIsStaff = isModerationStaffViewer(user);
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
        moderationReadAccessSql(
          profiles.moderationStatus,
          profiles.userId,
          user.userId,
          viewerIsStaff
        ),
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
  var viewerIsStaff = isModerationStaffViewer(viewer);

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
      moderationStatus: profiles.moderationStatus,
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
  var isOwner = viewer?.userId === row.userId;

  if (row.moderationStatus !== "visible" && !isOwner && !viewerIsStaff) {
    throw notFound("Profile not found");
  }

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
	      moderationStatus: row.moderationStatus,
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
	      moderationStatus: row.moderationStatus,
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
	    moderationStatus: row.moderationStatus,
	    createdAt: row.createdAt.toISOString(),
  });
});

type ProfileStatsFilm = {
  id: string;
  tmdbId: number | null;
  imdbId: string | null;
  title: string;
  year: number | null;
  posterUrl: string | null;
};

type ProfileStatsGenre = {
  name: string;
  count: number;
  percentage: number;
};

type ProfileStatsActivityDay = {
  date: string;
  count: number;
};

type ProfileStatsDiaryEntry = {
  postId: string;
  type: "log" | "review";
  createdAt: string;
  rating: number | null;
  film: ProfileStatsFilm;
};

function postVisibilityForStatsSql(viewerUserId: string | null, targetUserId: string) {
  if (viewerUserId === targetUserId) return sql<boolean>`true`;
  if (!viewerUserId) return eq(posts.visibility, "public");

  return sql<boolean>`(
    ${posts.visibility} = 'public'
    or (
      ${posts.visibility} = 'followers_only'
      and exists (
        select 1
        from ${follows}
        where ${follows.followerId} = ${viewerUserId}
          and ${follows.followingId} = ${targetUserId}
          and ${follows.status} = 'accepted'
      )
    )
  )`;
}

function emptyProfileStatsPayload(input: {
  username: string;
  filmsLoggedCount: number;
  memberSince: string | null;
}): ProfileStatsCachePayload {
  return {
    username: input.username,
    filmsLoggedCount: input.filmsLoggedCount,
    hoursWatched: 0,
    averageRating: null,
    reviewsWrittenCount: 0,
    reviewLikeCount: 0,
    memberSince: input.memberSince,
    favoriteFilms: [],
    genres: [],
    activity: [],
    recentDiary: [],
    cachedAt: new Date().toISOString(),
  };
}

async function assertCanReadProfileStats(input: {
  viewerUserId: string | null;
  targetUserId: string;
  isPrivate: boolean;
}) {
  if (input.viewerUserId === input.targetUserId) return;

  if (input.viewerUserId) {
    var moderation = await getModerationStatus(input.viewerUserId, input.targetUserId);
    if (moderation.blockedByViewer || moderation.blockedByTarget) {
      throw forbidden(moderation.blockedByViewer ? `BLOCKED_BY_YOU:${input.targetUserId}` : "BLOCKED_BY_THEM");
    }
  }

  if (!input.isPrivate) return;
  if (!input.viewerUserId) {
    throw forbidden("This account is private");
  }

  var db = getDb();
  var followRows = await db
    .select({ status: follows.status })
    .from(follows)
    .where(and(eq(follows.followerId, input.viewerUserId), eq(follows.followingId, input.targetUserId)))
    .limit(1);

  if (followRows[0]?.status !== "accepted") {
    throw forbidden("This account is private");
  }
}

function toFiniteNumber(value: unknown): number {
  var numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

profileRoutes.get("/:username/stats", async function (c) {
  var username = c.req.param("username").toLowerCase().trim();
  var db = getDb();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerUserId = viewer?.userId ?? null;
  var viewerIsStaff = isModerationStaffViewer(viewer);

  var profileRows = await db
    .select({
      userId: users.id,
      username: profiles.username,
      isPrivate: profiles.isPrivate,
      filmsLoggedCount: profiles.filmsLoggedCount,
      favoriteFilmIds: profiles.favoriteFilmIds,
      createdAt: profiles.createdAt,
      moderationStatus: profiles.moderationStatus,
      status: users.status,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.username, username))
    .limit(1);

  if (profileRows.length === 0) {
    throw notFound("Profile not found");
  }

  var profile = profileRows[0];
  if (
    profile.moderationStatus !== "visible" &&
    profile.userId !== viewerUserId &&
    !viewerIsStaff
  ) {
    throw notFound("Profile not found");
  }
  await assertCanReadProfileStats({
    viewerUserId,
    targetUserId: profile.userId,
    isPrivate: profile.isPrivate,
  });

  var memberSince = profile.createdAt ? profile.createdAt.toISOString() : null;
  if (profile.status === "deactivated") {
    return c.json(emptyProfileStatsPayload({
      username: profile.username,
      filmsLoggedCount: 0,
      memberSince: null,
    }));
  }

  var canUsePublicGuestCache =
    viewerUserId === null &&
    !profile.isPrivate &&
    profile.moderationStatus === "visible" &&
    !(await isModerationProfileStatsDirty(profile.userId));
  var cacheKey = profileStatsCacheKey({ username: profile.username, viewerId: null });
  if (canUsePublicGuestCache) {
    c.header("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    var cached = await getProfileStatsCache(cacheKey);
    if (cached) {
      c.header("X-Profile-Stats-Cache", "HIT");
      return c.json(cached);
    }
    c.header("X-Profile-Stats-Cache", "MISS");
  } else {
    c.header("Cache-Control", "private, no-store");
  }

  var visibilitySql = postVisibilityForStatsSql(viewerUserId, profile.userId);
  var basePostFilters = and(
    eq(posts.userId, profile.userId),
    eq(posts.isDeleted, false),
    visibilitySql,
    moderationReadAccessSql(
      posts.moderationStatus,
      posts.userId,
      viewerUserId,
      viewerIsStaff
    )
  );
  var diaryFilter = sql<boolean>`${posts.type} in ('log', 'review')`;

  var [aggregateRows, recentDiaryRows, genreResult, activityResult] = await Promise.all([
    db
      .select({
        filmsLoggedCount: sql<number>`count(*) filter (where ${diaryFilter} and ${posts.filmId} is not null)::integer`,
        hoursWatched: sql<number>`coalesce(sum(${films.runtime}) filter (where ${diaryFilter} and ${posts.filmId} is not null), 0)::integer`,
        averageRating: sql<number | null>`avg((${posts.filmRating}::numeric) / 2.0) filter (where ${diaryFilter} and ${posts.filmRating} is not null)`,
        reviewsWrittenCount: sql<number>`count(*) filter (where ${posts.type} = 'review')::integer`,
        reviewLikeCount: sql<number>`coalesce(sum(${posts.likeCount}) filter (where ${posts.type} = 'review'), 0)::integer`,
      })
      .from(posts)
      .leftJoin(films, eq(films.id, posts.filmId))
      .where(basePostFilters),
    db
      .select({
        postId: posts.id,
        type: posts.type,
        createdAt: posts.createdAt,
        rating: posts.filmRating,
        filmId: films.id,
        tmdbId: films.tmdbId,
        imdbId: films.imdbId,
        title: films.title,
        year: films.year,
        posterUrl: films.posterUrl,
      })
      .from(posts)
      .innerJoin(films, eq(films.id, posts.filmId))
      .where(and(basePostFilters, diaryFilter))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(4),
    db.execute<{
      name: string;
      count: number;
    }>(sql`
      select genre as name, count(*)::integer as count
      from (
        select unnest(${films.genres}) as genre
        from ${posts}
        inner join ${films} on ${films.id} = ${posts.filmId}
        where ${basePostFilters}
          and ${diaryFilter}
          and array_length(${films.genres}, 1) > 0
      ) genre_rows
      where genre is not null and length(trim(genre)) > 0
      group by genre
      order by count(*) desc, genre asc
      limit 6
    `),
    db.execute<{
      date: string;
      count: number;
    }>(sql`
      select
        to_char(date_trunc('day', ${posts.createdAt} at time zone 'UTC'), 'YYYY-MM-DD') as date,
        count(*)::integer as count
      from ${posts}
      where ${basePostFilters}
        and ${diaryFilter}
        and ${posts.createdAt} >= now() - interval '364 days'
      group by 1
      order by 1 asc
    `),
  ]);

  var favoriteFilmIds = (profile.favoriteFilmIds ?? []).slice(0, 6);
  var favoriteRows =
    favoriteFilmIds.length === 0
      ? []
      : await db
          .select({
            id: films.id,
            tmdbId: films.tmdbId,
            imdbId: films.imdbId,
            title: films.title,
            year: films.year,
            posterUrl: films.posterUrl,
          })
          .from(films)
          .where(inArray(films.id, favoriteFilmIds));

  var favoriteById = new Map(
    favoriteRows.map(function (row) {
      return [row.id, row];
    })
  );
  var favoriteFilms: ProfileStatsFilm[] = favoriteFilmIds
    .map(function (id) {
      var row = favoriteById.get(id);
      if (!row) return null;
      return {
        id: row.id,
        tmdbId: row.tmdbId,
        imdbId: row.imdbId,
        title: row.title,
        year: row.year,
        posterUrl: row.posterUrl,
      };
    })
    .filter(function (film): film is ProfileStatsFilm {
      return film !== null;
    });

  var aggregate = aggregateRows[0];
  var totalGenreCount = genreResult.rows.reduce(function (sum, row) {
    return sum + toFiniteNumber(row.count);
  }, 0);
  var genres: ProfileStatsGenre[] = genreResult.rows.map(function (row) {
    var count = toFiniteNumber(row.count);
    return {
      name: String(row.name),
      count,
      percentage: totalGenreCount > 0 ? Math.round((count / totalGenreCount) * 100) : 0,
    };
  });

  var activity: ProfileStatsActivityDay[] = activityResult.rows.map(function (row) {
    return {
      date: String(row.date),
      count: toFiniteNumber(row.count),
    };
  });

  var recentDiary: ProfileStatsDiaryEntry[] = recentDiaryRows
    .filter(function (row) {
      return row.type === "log" || row.type === "review";
    })
    .map(function (row) {
      var entryType: "log" | "review" = row.type === "review" ? "review" : "log";
      return {
        postId: row.postId,
        type: entryType,
        createdAt: row.createdAt.toISOString(),
        rating: row.rating == null ? null : row.rating / 2,
        film: {
          id: row.filmId,
          tmdbId: row.tmdbId,
          imdbId: row.imdbId,
          title: row.title,
          year: row.year,
          posterUrl: row.posterUrl,
        },
      };
    });

  var payload: ProfileStatsCachePayload = {
    username: profile.username,
    filmsLoggedCount: toFiniteNumber(aggregate?.filmsLoggedCount),
    hoursWatched: toFiniteNumber(aggregate?.hoursWatched),
    averageRating:
      aggregate?.averageRating == null ? null : Math.round(toFiniteNumber(aggregate.averageRating) * 10) / 10,
    reviewsWrittenCount: toFiniteNumber(aggregate?.reviewsWrittenCount),
    reviewLikeCount: toFiniteNumber(aggregate?.reviewLikeCount),
    memberSince,
    favoriteFilms,
    genres,
    activity,
    recentDiary,
    cachedAt: new Date().toISOString(),
  };

  if (canUsePublicGuestCache) {
    await setProfileStatsCache(cacheKey, payload, { authorUserId: profile.userId });
  }

  return c.json(payload);
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
    invalidateProfileStatsCaches([user.userId]),
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
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerIsStaff = isModerationStaffViewer(viewer);
  var followingId = await resolveTargetByUsername(
    username,
    viewer?.userId ?? null,
    viewerIsStaff
  );
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
        moderationReadAccessSql(
          profiles.moderationStatus,
          profiles.userId,
          viewer?.userId ?? null,
          viewerIsStaff
        ),
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
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerIsStaff = isModerationStaffViewer(viewer);
  var followerId = await resolveTargetByUsername(
    username,
    viewer?.userId ?? null,
    viewerIsStaff
  );
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
        moderationReadAccessSql(
          profiles.moderationStatus,
          profiles.userId,
          viewer?.userId ?? null,
          viewerIsStaff
        ),
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
  var followingId = await resolveTargetByUsername(
    username,
    viewer.userId,
    isModerationStaffViewer(viewer)
  );
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
        eq(profiles.moderationStatus, "visible"),
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
