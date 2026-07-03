import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { PublicProfile } from "@35mm/types";
import {
  onboardingSubmitSchema,
  resolveOnboardingTmdbFilmsSchema,
} from "@35mm/validators";
import { films, follows, profiles, users } from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { blockFiltersForAuthor, notMutedByViewerSql } from "../../lib/moderation.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { requireAuth } from "../../lib/middleware.js";
import { createUlid, isValidUlid } from "../../lib/ulid.js";
import { resolveProfileAvatarUrl, resolveProfileCoverUrl } from "../media/url.js";

export var onboardingRoutes = new Hono();

var ROLE_TO_HEADLINE: Record<string, string> = {
  cinephile: "Cinephile",
  creator: "Creator",
  critic: "Critic",
  film_student: "Film Student",
  industry: "Industry",
};

var GENRE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function dedupe(values: string[]): string[] {
  var seen = new Set<string>();
  var out: string[] = [];
  for (var value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function normalizeGenreSlugs(values: string[]): string[] {
  var normalized = dedupe(
    values
      .map(function (value) {
        return value.trim().toLowerCase();
      })
      .filter(Boolean)
  );

  for (var value of normalized) {
    if (!GENRE_SLUG_RE.test(value)) {
      throw badRequest("favoriteGenreIds must be genre slugs");
    }
  }

  return normalized;
}

async function getPublicProfile(userId: string): Promise<PublicProfile> {
  var db = getDb();
  var rows = await db
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
      headline: profiles.headline,
      headlineContext: profiles.headlineContext,
      favoriteFilmIds: profiles.favoriteFilmIds,
      favoriteGenreIds: profiles.favoriteGenreIds,
      filmsLoggedCount: profiles.filmsLoggedCount,
      onboardingCompleted: profiles.onboardingCompleted,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
      createdAt: profiles.createdAt,
      status: users.status,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Profile not found");
  }

  var row = rows[0];
  var [avatarUrl, avatarUrlLg, coverUrl] = await Promise.all([
    resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "sm"),
    resolveProfileAvatarUrl(row.avatarUrl, row.userId, row.avatarVariants, "lg"),
    resolveProfileCoverUrl(row.coverUrl, row.userId, row.coverVariants),
  ]);

  return {
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    avatarUrl,
    avatarUrlLg,
    coverUrl,
    location: row.location,
    website: row.website,
    dateOfBirth: row.dateOfBirth,
    role: row.role,
    roleContext: row.roleContext,
    headline: row.headline,
    headlineContext: row.headlineContext,
    favoriteFilmIds: row.favoriteFilmIds ?? [],
    favoriteGenreIds: row.favoriteGenreIds ?? [],
    filmsLoggedCount: row.filmsLoggedCount ?? 0,
    onboardingCompleted: row.onboardingCompleted,
    onboardingCompletedAt: row.onboardingCompletedAt
      ? row.onboardingCompletedAt.toISOString()
      : null,
    isDeactivated: row.status === "deactivated",
    createdAt: row.createdAt.toISOString(),
  };
}

onboardingRoutes.get("/me/onboarding-status", requireAuth, async function (c) {
  var user = c.get("user");
  var db = getDb();

  var rows = await db
    .select({
      onboardingCompleted: profiles.onboardingCompleted,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Profile not found");
  }

  return c.json({
    completed: rows[0].onboardingCompleted,
    completedAt: rows[0].onboardingCompletedAt
      ? rows[0].onboardingCompletedAt.toISOString()
      : null,
  });
});

onboardingRoutes.post("/onboarding/films/resolve", requireAuth, async function (c) {
  var payload = resolveOnboardingTmdbFilmsSchema.parse(await c.req.json());
  var db = getDb();
  var ids: string[] = [];

  for (var filmInput of payload.films) {
    var existingRows = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.tmdbId, filmInput.tmdbId))
      .limit(1);

    if (existingRows.length > 0) {
      ids.push(existingRows[0].id);
      continue;
    }

    var nextId = createUlid();
    // films.id must always be a ULID. DB does not enforce format — this is the app-layer guard.
    // Never insert a TMDB id or UUID here.
    if (!isValidUlid(nextId)) {
      throw badRequest("Generated film ID is not a valid ULID");
    }
    var inserted = await db
      .insert(films)
      .values({
        id: nextId,
        tmdbId: filmInput.tmdbId,
        title: filmInput.title,
        year: filmInput.year ?? null,
        posterUrl: filmInput.posterUrl ?? null,
        genres: filmInput.genres,
        source: "tmdb_import",
      })
      .onConflictDoNothing()
      .returning({ id: films.id });

    if (inserted.length > 0) {
      ids.push(inserted[0].id);
      continue;
    }

    var resolved = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.tmdbId, filmInput.tmdbId))
      .limit(1);

    if (resolved.length === 0) {
      throw badRequest("Unable to resolve film");
    }
    ids.push(resolved[0].id);
  }

  return c.json({ ids });
});

onboardingRoutes.post("/me/onboarding", requireAuth, async function (c) {
  var user = c.get("user");
  var payload = onboardingSubmitSchema.parse(await c.req.json());
  var db = getDb();

  var favoriteFilmIds = dedupe(
    payload.favoriteFilmIds.map(function (id) {
      return id.trim();
    }).filter(Boolean)
  );
  var favoriteGenreIds = normalizeGenreSlugs(payload.favoriteGenreIds);
  var followUserIds = dedupe(
    payload.followUserIds
      .map(function (id) {
        return id.trim();
      })
      .filter(Boolean)
  );

  if (followUserIds.includes(user.userId)) {
    throw badRequest("Cannot follow yourself");
  }

  if (favoriteFilmIds.length > 0) {
    var filmRows = await db
      .select({ id: films.id })
      .from(films)
      .where(inArray(films.id, favoriteFilmIds));

    if (filmRows.length !== favoriteFilmIds.length) {
      throw badRequest("favoriteFilmIds contain unknown film IDs");
    }
  }

  if (followUserIds.length > 0) {
    var followableRows = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(
        and(
          inArray(users.id, followUserIds),
          eq(users.status, "active"),
          eq(profiles.isPrivate, false),
          ...blockFiltersForAuthor(user.userId, users.id)
        )
      );

    if (followableRows.length !== followUserIds.length) {
      throw badRequest("followUserIds contain unknown or unavailable users");
    }
  }

  var roleLabel = ROLE_TO_HEADLINE[payload.role];
  var contextValue =
    payload.role === "cinephile"
      ? null
      : payload.headlineContext?.trim() || null;
  var now = new Date();

  await db
    .update(profiles)
    .set({
      role: roleLabel,
      roleContext: contextValue,
      headline: roleLabel,
      headlineContext: contextValue,
      favoriteFilmIds,
      favoriteGenreIds,
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      updatedAt: now,
    })
    .where(eq(profiles.userId, user.userId));

  if (followUserIds.length > 0) {
    await db
      .insert(follows)
      .values(
        followUserIds.map(function (targetUserId) {
          return {
            followerId: user.userId,
            followingId: targetUserId,
            status: "accepted" as const,
          };
        })
      )
      .onConflictDoNothing();
  }

  var profile = await getPublicProfile(user.userId);
  return c.json({ ok: true, profile });
});

onboardingRoutes.get("/onboarding/suggestions", requireAuth, async function (c) {
  var user = c.get("user");
  var db = getDb();

  var rows = await db
    .select({
      id: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      avatarVariants: profiles.avatarVariants,
      role: sql<string | null>`coalesce(${profiles.headline}, ${profiles.role})`,
      roleContext: sql<string | null>`coalesce(${profiles.headlineContext}, ${profiles.roleContext})`,
      filmsLoggedCount: profiles.filmsLoggedCount,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(
      and(
        eq(users.status, "active"),
        eq(profiles.isPrivate, false),
        sql`${profiles.userId} <> ${user.userId}`,
        sql<boolean>`not exists(
          select 1
          from ${follows}
          where ${follows.followerId} = ${user.userId}
            and ${follows.followingId} = ${profiles.userId}
        )`,
        ...blockFiltersForAuthor(user.userId, profiles.userId),
        notMutedByViewerSql(user.userId, profiles.userId)
      )
    )
    .orderBy(desc(profiles.filmsLoggedCount), desc(profiles.createdAt), profiles.userId)
    .limit(10);

  var usersOut = await Promise.all(
    rows.map(async function (row) {
      return {
        id: row.id,
        username: row.username,
        displayName: row.displayName,
        avatarUrl: await resolveProfileAvatarUrl(row.avatarUrl, row.id, row.avatarVariants, "sm"),
        avatarUrlLg: await resolveProfileAvatarUrl(row.avatarUrl, row.id, row.avatarVariants, "lg"),
        role: row.role,
        roleContext: row.roleContext,
        filmsLoggedCount: row.filmsLoggedCount ?? 0,
        followerCount: 0,
      };
    })
  );

  return c.json({ users: usersOut });
});
