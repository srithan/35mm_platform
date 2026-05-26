import { Hono } from "hono";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { users, profiles, follows } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { getModerationStatus, notBlockedWithViewerSql } from "../../lib/moderation.js";
import { requireAuth, getOptionalAuthUser } from "../../lib/middleware.js";
import { notFound, badRequest } from "../../lib/errors.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { cursorPaginationSchema, updateProfileSchema } from "@35mm/validators";
import { isR2ConfiguredPublicUrl, resolvePublicMediaUrl } from "../media/url.js";

export var profileRoutes = new Hono();

function isR2Url(value: string): boolean {
  return isR2ConfiguredPublicUrl(value);
}

async function resolveProfileMedia(avatarUrl: string | null, coverUrl: string | null) {
  var [resolvedAvatarUrl, resolvedCoverUrl] = await Promise.all([
    resolvePublicMediaUrl(avatarUrl),
    resolvePublicMediaUrl(coverUrl),
  ]);

  return {
    avatarUrl: resolvedAvatarUrl,
    coverUrl: resolvedCoverUrl,
  };
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
      coverUrl: profiles.coverUrl,
      location: profiles.location,
      website: profiles.website,
      dateOfBirth: profiles.dateOfBirth,
      role: profiles.role,
      roleContext: profiles.roleContext,
      headline: profiles.headline,
      headlineContext: profiles.headlineContext,
      isPrivate: profiles.isPrivate,
      filmsLoggedCount: profiles.filmsLoggedCount,
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

  var [followerRows, followingRows, followRelationRows] = await Promise.all([
    db
      .select({ id: follows.followerId })
      .from(follows)
      .where(and(eq(follows.followingId, row.userId), eq(follows.status, "accepted"))),
    db
      .select({ id: follows.followingId })
      .from(follows)
      .where(and(eq(follows.followerId, row.userId), eq(follows.status, "accepted"))),
    viewer
      ? db
          .select({ status: follows.status })
          .from(follows)
          .where(and(eq(follows.followerId, viewer.userId), eq(follows.followingId, row.userId)))
          .limit(1)
      : Promise.resolve([] as Array<{ status: "pending" | "accepted" }>),
  ]);

  var followerCount = followerRows.length;
  var followingCount = followingRows.length;
  var followStatus = followRelationRows[0]?.status ?? null;
  var isFollowing = followStatus === "accepted";
  var isFollowRequested = followStatus === "pending";
  var isOwner = viewer?.userId === row.userId;

  if (row.status === "deactivated") {
    return c.json({
      username: row.username,
      displayName: "Deactivated Account",
      bio: null,
      avatarUrl: null,
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
      isFollowing,
      isFollowRequested,
      isPrivate: false,
      isDeactivated: true,
    });
  }

  var media = await resolveProfileMedia(row.avatarUrl, row.coverUrl);

  if (row.isPrivate && !isOwner && !isFollowing) {
    return c.json({
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      bio: row.bio,
      avatarUrl: media.avatarUrl,
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
      isFollowing: false,
      isFollowRequested,
      isPrivate: true,
      posts: null,
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
    isFollowing,
    isFollowRequested,
    isPrivate: row.isPrivate,
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

profileRoutes.patch("/me", requireAuth, async function (c) {
  var user = c.get("user");
  var body = updateProfileSchema.parse(await c.req.json());
  var db = getDb();

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

  if (body.isPrivate !== undefined) {
    updates.isPrivate = Boolean(body.isPrivate);
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
    } else if (typeof body.avatarUrl === "string" && isR2Url(body.avatarUrl)) {
      updates.avatarUrl = body.avatarUrl;
    } else {
      return c.json({ code: "BAD_MEDIA_URL", message: "Invalid avatar URL" }, 400);
    }
  }

  if (body.coverUrl !== undefined) {
    if (body.coverUrl === null || body.coverUrl === "") {
      updates.coverUrl = null;
    } else if (typeof body.coverUrl === "string" && isR2Url(body.coverUrl)) {
      updates.coverUrl = body.coverUrl;
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
        coverUrl: profiles.coverUrl,
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
      existingRows[0].avatarUrl,
      existingRows[0].coverUrl
    );

    return c.json({
      ok: true,
      message: "No changes",
      profile: {
        ...existingRows[0],
        avatarUrl: media.avatarUrl,
        coverUrl: media.coverUrl,
      },
    });
  }

  updates.updatedAt = new Date();

  await db
    .update(profiles)
    .set(updates)
    .where(eq(profiles.userId, user.userId));

  var updated = await db
    .select({
      userId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      coverUrl: profiles.coverUrl,
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

  var media = await resolveProfileMedia(updated[0].avatarUrl, updated[0].coverUrl);

  return c.json({
    ok: true,
    profile: {
      ...updated[0],
      avatarUrl: media.avatarUrl,
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
        avatarUrl: await resolvePublicMediaUrl(row.avatarUrl),
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
        avatarUrl: await resolvePublicMediaUrl(row.avatarUrl),
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
