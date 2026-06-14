import { Hono } from "hono";
import { and, asc, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import {
  filmListEntries,
  filmListLikes,
  filmLists,
  films,
  profiles,
  users,
} from "@35mm/db/schema";
import {
  cloneFilmListSchema,
  createFilmListSchema,
  cursorPaginationSchema,
  filmListEntrySchema,
  reorderFilmListEntriesSchema,
  updateFilmListEntrySchema,
  updateFilmListSchema,
  watchlistFilmSchema,
} from "@35mm/validators";
import type {
  FilmListDetail,
  FilmListEntry,
  FilmListPage,
  FilmListSummary,
  PublicUser,
  WatchlistStatus,
} from "@35mm/types";
import { getDb } from "../../lib/db.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { getOptionalAuthUser, requireAuth } from "../../lib/middleware.js";
import { createUlid, isValidUlid } from "../../lib/ulid.js";
import { ensureWatchlistForUser, nextListPosition, resolveFilmId } from "../../lib/filmLists.js";

export var listRoutes = new Hono();

type ListRow = {
  id: string;
  userId: string;
  type: "custom" | "watchlist";
  title: string;
  description: string | null;
  visibility: "public" | "private";
  isRanked: boolean;
  tags: string[];
  shareSlug: string;
  likeCount: number;
  commentCount: number;
  entryCount: number;
  clonedFromListId: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  ownerRole: string | null;
  ownerRoleContext: string | null;
  ownerFilmsLoggedCount: number;
  isLiked: string | null;
};

type ListCursor = {
  value: string;
  id: string;
};

function cleanTags(tags: string[] | undefined): string[] {
  var seen = new Set<string>();
  var out: string[] = [];
  for (var tag of tags ?? []) {
    var normalized = tag.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out.slice(0, 20);
}

function assertUlidParam(value: string, label: string): string {
  if (!isValidUlid(value)) throw badRequest(`${label} must be a ULID`);
  return value;
}

function encodeListCursor(input: ListCursor): string {
  return Buffer.from(JSON.stringify({ v: input.value, i: input.id }), "utf8").toString("base64");
}

function decodeListCursor(cursor: string | undefined): ListCursor | null {
  if (!cursor) return null;
  try {
    var parsed = JSON.parse(Buffer.from(cursor, "base64").toString("utf8")) as {
      v?: unknown;
      i?: unknown;
    };
    if (typeof parsed.v !== "string" || typeof parsed.i !== "string" || parsed.i.length === 0) {
      throw new Error("invalid-shape");
    }
    return { value: parsed.v, id: parsed.i };
  } catch (_err) {
    throw badRequest("Invalid cursor");
  }
}

function canViewList(row: { visibility: "public" | "private"; userId: string; isDeleted: boolean }, viewerId: string | null): boolean {
  if (row.isDeleted) return false;
  if (row.visibility === "public") return true;
  return viewerId === row.userId;
}

function ownerFromRow(row: ListRow): PublicUser {
  return {
    id: row.userId,
    username: row.ownerUsername,
    displayName: row.ownerDisplayName,
    avatarUrl: row.ownerAvatarUrl,
    role: row.ownerRole,
    roleContext: row.ownerRoleContext,
    filmsLoggedCount: row.ownerFilmsLoggedCount,
  };
}

async function posterUrlsForList(listId: string): Promise<Array<string | null>> {
  var db = getDb();
  var rows = await db
    .select({ posterUrl: films.posterUrl })
    .from(filmListEntries)
    .innerJoin(films, eq(films.id, filmListEntries.filmId))
    .where(eq(filmListEntries.listId, listId))
    .orderBy(asc(filmListEntries.position), asc(filmListEntries.addedAt))
    .limit(3);

  return rows.map(function (row) {
    return row.posterUrl;
  });
}

async function toSummary(row: ListRow, viewerId: string | null): Promise<FilmListSummary> {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    description: row.description,
    visibility: row.visibility,
    isRanked: row.isRanked,
    tags: row.tags ?? [],
    shareSlug: row.shareSlug,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    entryCount: row.entryCount,
    isLiked: Boolean(row.isLiked),
    isOwner: viewerId === row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    owner: ownerFromRow(row),
    posterUrls: await posterUrlsForList(row.id),
  };
}

async function selectListById(listId: string, viewerId: string | null): Promise<ListRow> {
  var db = getDb();
  var rows = await db
    .select({
      id: filmLists.id,
      userId: filmLists.userId,
      type: filmLists.type,
      title: filmLists.title,
      description: filmLists.description,
      visibility: filmLists.visibility,
      isRanked: filmLists.isRanked,
      tags: filmLists.tags,
      shareSlug: filmLists.shareSlug,
      likeCount: filmLists.likeCount,
      commentCount: filmLists.commentCount,
      entryCount: filmLists.entryCount,
      clonedFromListId: filmLists.clonedFromListId,
      isDeleted: filmLists.isDeleted,
      createdAt: filmLists.createdAt,
      updatedAt: filmLists.updatedAt,
      ownerUsername: profiles.username,
      ownerDisplayName: profiles.displayName,
      ownerAvatarUrl: profiles.avatarUrl,
      ownerRole: profiles.role,
      ownerRoleContext: profiles.roleContext,
      ownerFilmsLoggedCount: profiles.filmsLoggedCount,
      isLiked: filmListLikes.userId,
    })
    .from(filmLists)
    .innerJoin(users, eq(users.id, filmLists.userId))
    .innerJoin(profiles, eq(profiles.userId, filmLists.userId))
    .leftJoin(
      filmListLikes,
      and(eq(filmListLikes.listId, filmLists.id), viewerId ? eq(filmListLikes.userId, viewerId) : sql`false`)
    )
    .where(eq(filmLists.id, listId))
    .limit(1);

  if (rows.length === 0 || !canViewList(rows[0], viewerId)) throw notFound("List not found");
  return rows[0];
}

async function listEntries(listId: string): Promise<FilmListEntry[]> {
  var db = getDb();
  var rows = await db
    .select({
      id: filmListEntries.id,
      filmId: films.id,
      title: films.title,
      year: films.year,
      posterUrl: films.posterUrl,
      genres: films.genres,
      position: filmListEntries.position,
      note: filmListEntries.note,
      addedAt: filmListEntries.addedAt,
    })
    .from(filmListEntries)
    .innerJoin(films, eq(films.id, filmListEntries.filmId))
    .where(eq(filmListEntries.listId, listId))
    .orderBy(asc(filmListEntries.position), asc(filmListEntries.addedAt));

  return rows.map(function (row) {
    return {
      id: row.id,
      film: {
        id: row.filmId,
        title: row.title,
        year: row.year,
        posterUrl: row.posterUrl,
        genres: row.genres ?? [],
      },
      position: row.position,
      note: row.note,
      addedAt: row.addedAt.toISOString(),
    };
  });
}

listRoutes.get("/profile/:username", async function (c) {
  var username = c.req.param("username").toLowerCase().trim();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var pagination = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor") ?? undefined,
    limit: c.req.query("limit") ?? undefined,
  });
  var sort = c.req.query("sort") ?? "updated";
  if (sort !== "updated" && sort !== "popular" && sort !== "alpha") {
    throw badRequest("Invalid sort");
  }

  var db = getDb();
  var profileRows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);
  if (profileRows.length === 0) throw notFound("Profile not found");

  var targetUserId = profileRows[0].userId;
  var viewerId = viewer?.userId ?? null;
  var isOwner = viewerId === targetUserId;
  var cursor = decodeListCursor(pagination.cursor);
  var baseWhere = and(
    eq(filmLists.userId, targetUserId),
    eq(filmLists.isDeleted, false),
    isOwner ? undefined : eq(filmLists.visibility, "public")
  );
  var cursorWhere =
    cursor && sort === "updated"
      ? or(
          lt(filmLists.updatedAt, new Date(cursor.value)),
          and(eq(filmLists.updatedAt, new Date(cursor.value)), lt(filmLists.id, cursor.id))
        )
      : cursor && sort === "popular"
        ? or(
            lt(filmLists.likeCount, Number(cursor.value)),
            and(eq(filmLists.likeCount, Number(cursor.value)), lt(filmLists.id, cursor.id))
          )
        : cursor && sort === "alpha"
          ? or(
              sql`lower(${filmLists.title}) > ${cursor.value}`,
              and(sql`lower(${filmLists.title}) = ${cursor.value}`, lt(filmLists.id, cursor.id))
            )
          : undefined;

  var order =
    sort === "popular"
      ? [desc(filmLists.likeCount), desc(filmLists.id)]
      : sort === "alpha"
        ? [asc(sql`lower(${filmLists.title})`), desc(filmLists.id)]
        : [desc(filmLists.updatedAt), desc(filmLists.id)];

  var rows = await db
    .select({
      id: filmLists.id,
      userId: filmLists.userId,
      type: filmLists.type,
      title: filmLists.title,
      description: filmLists.description,
      visibility: filmLists.visibility,
      isRanked: filmLists.isRanked,
      tags: filmLists.tags,
      shareSlug: filmLists.shareSlug,
      likeCount: filmLists.likeCount,
      commentCount: filmLists.commentCount,
      entryCount: filmLists.entryCount,
      clonedFromListId: filmLists.clonedFromListId,
      isDeleted: filmLists.isDeleted,
      createdAt: filmLists.createdAt,
      updatedAt: filmLists.updatedAt,
      ownerUsername: profiles.username,
      ownerDisplayName: profiles.displayName,
      ownerAvatarUrl: profiles.avatarUrl,
      ownerRole: profiles.role,
      ownerRoleContext: profiles.roleContext,
      ownerFilmsLoggedCount: profiles.filmsLoggedCount,
      isLiked: filmListLikes.userId,
    })
    .from(filmLists)
    .innerJoin(profiles, eq(profiles.userId, filmLists.userId))
    .leftJoin(
      filmListLikes,
      and(eq(filmListLikes.listId, filmLists.id), viewerId ? eq(filmListLikes.userId, viewerId) : sql`false`)
    )
    .where(and(baseWhere, cursorWhere))
    .orderBy(...order)
    .limit(pagination.limit + 1);

  var pageRows = rows.slice(0, pagination.limit);
  var summaries = await Promise.all(pageRows.map(function (row) {
    return toSummary(row, viewerId);
  }));
  var last = pageRows[pageRows.length - 1];
  var nextCursor =
    rows.length > pagination.limit && last
      ? encodeListCursor(
          sort === "popular"
            ? { value: String(last.likeCount), id: last.id }
            : sort === "alpha"
              ? { value: last.title.toLowerCase(), id: last.id }
              : { value: last.updatedAt.toISOString(), id: last.id }
        )
      : null;

  return c.json({
    items: summaries,
    nextCursor,
    hasMore: nextCursor != null,
  } satisfies FilmListPage);
});

listRoutes.get("/films/:filmId", async function (c) {
  var filmId = assertUlidParam(c.req.param("filmId"), "filmId");
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var pagination = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor") ?? undefined,
    limit: c.req.query("limit") ?? undefined,
  });
  var cursor = decodeListCursor(pagination.cursor);
  var db = getDb();

  var cursorWhere = cursor
    ? or(
        lt(filmLists.likeCount, Number(cursor.value)),
        and(eq(filmLists.likeCount, Number(cursor.value)), lt(filmLists.id, cursor.id))
      )
    : undefined;

  var rows = await db
    .select({
      id: filmLists.id,
      userId: filmLists.userId,
      type: filmLists.type,
      title: filmLists.title,
      description: filmLists.description,
      visibility: filmLists.visibility,
      isRanked: filmLists.isRanked,
      tags: filmLists.tags,
      shareSlug: filmLists.shareSlug,
      likeCount: filmLists.likeCount,
      commentCount: filmLists.commentCount,
      entryCount: filmLists.entryCount,
      clonedFromListId: filmLists.clonedFromListId,
      isDeleted: filmLists.isDeleted,
      createdAt: filmLists.createdAt,
      updatedAt: filmLists.updatedAt,
      ownerUsername: profiles.username,
      ownerDisplayName: profiles.displayName,
      ownerAvatarUrl: profiles.avatarUrl,
      ownerRole: profiles.role,
      ownerRoleContext: profiles.roleContext,
      ownerFilmsLoggedCount: profiles.filmsLoggedCount,
      isLiked: filmListLikes.userId,
    })
    .from(filmListEntries)
    .innerJoin(filmLists, eq(filmLists.id, filmListEntries.listId))
    .innerJoin(profiles, eq(profiles.userId, filmLists.userId))
    .leftJoin(
      filmListLikes,
      and(
        eq(filmListLikes.listId, filmLists.id),
        viewer ? eq(filmListLikes.userId, viewer.userId) : sql`false`
      )
    )
    .where(
      and(
        eq(filmListEntries.filmId, filmId),
        eq(filmLists.visibility, "public"),
        eq(filmLists.isDeleted, false),
        cursorWhere
      )
    )
    .orderBy(desc(filmLists.likeCount), desc(filmLists.updatedAt), desc(filmLists.id))
    .limit(pagination.limit + 1);

  var pageRows = rows.slice(0, pagination.limit);
  var summaries = await Promise.all(pageRows.map(function (row) {
    return toSummary(row, viewer?.userId ?? null);
  }));
  var last = pageRows[pageRows.length - 1];
  var nextCursor =
    rows.length > pagination.limit && last
      ? encodeListCursor({ value: String(last.likeCount), id: last.id })
      : null;

  return c.json({
    items: summaries,
    nextCursor,
    hasMore: nextCursor != null,
  } satisfies FilmListPage);
});

listRoutes.get("/me/watchlist", requireAuth, async function (c) {
  var user = c.get("user");
  var watchlistId = await ensureWatchlistForUser(user.userId);
  var row = await selectListById(watchlistId, user.userId);
  var summary = await toSummary(row, user.userId);
  return c.json({ ...summary, entries: await listEntries(row.id), clonedFromListId: null } satisfies FilmListDetail);
});

listRoutes.post("/films/resolve", requireAuth, async function (c) {
  var input = watchlistFilmSchema.parse(await c.req.json());
  var filmId = await resolveFilmId({
    filmId: input.filmId,
    film: input.film,
    catalogFilm: input.catalogFilm,
  });

  return c.json({ filmId });
});

listRoutes.get("/:listId", async function (c) {
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var row = await selectListById(listId, viewer?.userId ?? null);
  var summary = await toSummary(row, viewer?.userId ?? null);
  return c.json({ ...summary, entries: await listEntries(row.id), clonedFromListId: row.clonedFromListId } satisfies FilmListDetail);
});

listRoutes.post("/", requireAuth, async function (c) {
  var user = c.get("user");
  var input = createFilmListSchema.parse(await c.req.json());
  var db = getDb();
  var id = createUlid();
  var shareSlug = `${user.username}-${id.toLowerCase()}`;

  await db.insert(filmLists).values({
    id,
    userId: user.userId,
    type: "custom",
    title: input.title,
    description: input.description ?? null,
    visibility: input.visibility,
    isRanked: input.isRanked,
    tags: cleanTags(input.tags),
    shareSlug,
  });

  var row = await selectListById(id, user.userId);
  return c.json(await toSummary(row, user.userId), 201);
});

listRoutes.patch("/:listId", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var input = updateFilmListSchema.parse(await c.req.json());
  var row = await selectListById(listId, user.userId);
  if (row.userId !== user.userId) throw forbidden("You do not own this list");

  var updates: Record<string, unknown> = { updatedAt: new Date() };
  if (row.type === "watchlist") {
    if (input.visibility !== undefined) updates.visibility = input.visibility;
  } else {
    if (input.title !== undefined) updates.title = input.title;
    if (input.description !== undefined) updates.description = input.description;
    if (input.visibility !== undefined) updates.visibility = input.visibility;
    if (input.isRanked !== undefined) updates.isRanked = input.isRanked;
    if (input.tags !== undefined) updates.tags = cleanTags(input.tags);
  }

  await getDb().update(filmLists).set(updates).where(eq(filmLists.id, listId));
  return c.json(await toSummary(await selectListById(listId, user.userId), user.userId));
});

listRoutes.delete("/:listId", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var row = await selectListById(listId, user.userId);
  if (row.userId !== user.userId) throw forbidden("You do not own this list");
  if (row.type === "watchlist") throw forbidden("Watchlist cannot be deleted");

  await getDb()
    .update(filmLists)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(eq(filmLists.id, listId));

  return c.json({ ok: true });
});

listRoutes.post("/:listId/entries", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var input = filmListEntrySchema.parse(await c.req.json());
  var row = await selectListById(listId, user.userId);
  if (row.userId !== user.userId) throw forbidden("You do not own this list");
  if (row.type === "watchlist" && input.note) throw badRequest("Watchlist entries cannot have notes");

  var filmId = await resolveFilmId({ filmId: input.filmId, film: input.film, catalogFilm: input.catalogFilm });
  var position = input.position ?? await nextListPosition(listId);
  var entryId = createUlid();
  var db = getDb();
  var inserted = await db
    .insert(filmListEntries)
    .values({
      id: entryId,
      listId,
      filmId,
      position,
      note: row.type === "watchlist" ? null : input.note ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: filmListEntries.id });

  if (inserted.length > 0) {
    await db
      .update(filmLists)
      .set({ entryCount: sql`${filmLists.entryCount} + 1`, updatedAt: new Date() })
      .where(eq(filmLists.id, listId));
  }

  return c.json({ ok: true, entryId: inserted[0]?.id ?? null, filmId, duplicate: inserted.length === 0 });
});

listRoutes.patch("/:listId/entries/reorder", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var input = reorderFilmListEntriesSchema.parse(await c.req.json());
  var row = await selectListById(listId, user.userId);
  if (row.userId !== user.userId) throw forbidden("You do not own this list");

  var entryIds = input.entries.map(function (entry) {
    return entry.entryId;
  });
  var db = getDb();
  var ownedRows = await db
    .select({ id: filmListEntries.id })
    .from(filmListEntries)
    .where(and(eq(filmListEntries.listId, listId), inArray(filmListEntries.id, entryIds)));
  if (ownedRows.length !== entryIds.length) throw badRequest("One or more entries are not in this list");

  for (var entry of input.entries) {
    await db
      .update(filmListEntries)
      .set({ position: entry.position })
      .where(and(eq(filmListEntries.listId, listId), eq(filmListEntries.id, entry.entryId)));
  }
  await db.update(filmLists).set({ updatedAt: new Date() }).where(eq(filmLists.id, listId));

  return c.json({ ok: true });
});

listRoutes.patch("/:listId/entries/:entryId", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var entryId = c.req.param("entryId");
  var input = updateFilmListEntrySchema.parse(await c.req.json());
  var row = await selectListById(listId, user.userId);
  if (row.userId !== user.userId) throw forbidden("You do not own this list");
  if (row.type === "watchlist" && input.note) throw badRequest("Watchlist entries cannot have notes");

  var updates: Record<string, unknown> = {};
  if (input.note !== undefined) updates.note = row.type === "watchlist" ? null : input.note;
  if (input.position !== undefined) updates.position = input.position;
  if (Object.keys(updates).length === 0) throw badRequest("No changes provided");

  await getDb()
    .update(filmListEntries)
    .set(updates)
    .where(and(eq(filmListEntries.listId, listId), eq(filmListEntries.id, entryId)));
  await getDb().update(filmLists).set({ updatedAt: new Date() }).where(eq(filmLists.id, listId));

  return c.json({ ok: true });
});

listRoutes.delete("/:listId/entries/:entryId", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var entryId = c.req.param("entryId");
  var row = await selectListById(listId, user.userId);
  if (row.userId !== user.userId) throw forbidden("You do not own this list");

  var deleted = await getDb()
    .delete(filmListEntries)
    .where(and(eq(filmListEntries.listId, listId), eq(filmListEntries.id, entryId)))
    .returning({ id: filmListEntries.id });
  if (deleted.length > 0) {
    await getDb()
      .update(filmLists)
      .set({ entryCount: sql`greatest(${filmLists.entryCount} - 1, 0)`, updatedAt: new Date() })
      .where(eq(filmLists.id, listId));
  }

  return c.json({ ok: true });
});

listRoutes.post("/:listId/like", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  var row = await selectListById(listId, user.userId);
  if (row.userId === user.userId) throw badRequest("You cannot like your own list");

  var inserted = await getDb()
    .insert(filmListLikes)
    .values({ listId, userId: user.userId })
    .onConflictDoNothing()
    .returning({ userId: filmListLikes.userId });
  if (inserted.length > 0) {
    await getDb().update(filmLists).set({ likeCount: sql`${filmLists.likeCount} + 1` }).where(eq(filmLists.id, listId));
  }

  return c.json({ ok: true, isLiked: true });
});

listRoutes.delete("/:listId/like", requireAuth, async function (c) {
  var user = c.get("user");
  var listId = assertUlidParam(c.req.param("listId"), "listId");
  await selectListById(listId, user.userId);
  var deleted = await getDb()
    .delete(filmListLikes)
    .where(and(eq(filmListLikes.listId, listId), eq(filmListLikes.userId, user.userId)))
    .returning({ userId: filmListLikes.userId });
  if (deleted.length > 0) {
    await getDb().update(filmLists).set({ likeCount: sql`greatest(${filmLists.likeCount} - 1, 0)` }).where(eq(filmLists.id, listId));
  }

  return c.json({ ok: true, isLiked: false });
});

listRoutes.post("/:listId/clone", requireAuth, async function (c) {
  var user = c.get("user");
  var sourceListId = assertUlidParam(c.req.param("listId"), "listId");
  var input = cloneFilmListSchema.parse(await c.req.json().catch(function () {
    return {};
  }));
  var source = await selectListById(sourceListId, user.userId);
  var entries = await listEntries(sourceListId);
  var id = createUlid();
  var db = getDb();

  await db.insert(filmLists).values({
    id,
    userId: user.userId,
    type: "custom",
    title: input.title ?? `${source.title} copy`,
    description: source.description,
    visibility: input.visibility,
    isRanked: source.isRanked,
    tags: source.tags,
    shareSlug: `${user.username}-${id.toLowerCase()}`,
    entryCount: entries.length,
    clonedFromListId: source.id,
  });

  for (var entry of entries) {
    await db.insert(filmListEntries).values({
      id: createUlid(),
      listId: id,
      filmId: entry.film.id,
      position: entry.position,
      note: entry.note,
    });
  }

  return c.json(await toSummary(await selectListById(id, user.userId), user.userId), 201);
});

listRoutes.get("/watchlist/films/:filmId", requireAuth, async function (c) {
  var user = c.get("user");
  var filmId = assertUlidParam(c.req.param("filmId"), "filmId");
  var watchlistId = await ensureWatchlistForUser(user.userId);
  var rows = await getDb()
    .select({ id: filmListEntries.id })
    .from(filmListEntries)
    .where(and(eq(filmListEntries.listId, watchlistId), eq(filmListEntries.filmId, filmId)))
    .limit(1);

  return c.json({
    filmId,
    isInWatchlist: rows.length > 0,
    watchlistId,
    entryId: rows[0]?.id ?? null,
  } satisfies WatchlistStatus);
});

listRoutes.post("/watchlist/films", requireAuth, async function (c) {
  var user = c.get("user");
  var input = watchlistFilmSchema.parse(await c.req.json());
  var filmId = await resolveFilmId({ filmId: input.filmId, film: input.film, catalogFilm: input.catalogFilm });
  var watchlistId = await ensureWatchlistForUser(user.userId);
  var position = await nextListPosition(watchlistId);
  var inserted = await getDb()
    .insert(filmListEntries)
    .values({ id: createUlid(), listId: watchlistId, filmId, position, note: null })
    .onConflictDoNothing()
    .returning({ id: filmListEntries.id });

  if (inserted.length > 0) {
    await getDb()
      .update(filmLists)
      .set({ entryCount: sql`${filmLists.entryCount} + 1`, updatedAt: new Date() })
      .where(eq(filmLists.id, watchlistId));
  }

  return c.json({
    filmId,
    isInWatchlist: true,
    watchlistId,
    entryId: inserted[0]?.id ?? null,
  } satisfies WatchlistStatus);
});

listRoutes.delete("/watchlist/films/:filmId", requireAuth, async function (c) {
  var user = c.get("user");
  var filmId = assertUlidParam(c.req.param("filmId"), "filmId");
  var watchlistId = await ensureWatchlistForUser(user.userId);
  var deleted = await getDb()
    .delete(filmListEntries)
    .where(and(eq(filmListEntries.listId, watchlistId), eq(filmListEntries.filmId, filmId)))
    .returning({ id: filmListEntries.id });
  if (deleted.length > 0) {
    await getDb()
      .update(filmLists)
      .set({ entryCount: sql`greatest(${filmLists.entryCount} - 1, 0)`, updatedAt: new Date() })
      .where(eq(filmLists.id, watchlistId));
  }

  return c.json({ ok: true, isInWatchlist: false });
});
