import { Hono } from "hono";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { createPostSchema, cursorPaginationSchema } from "@35mm/validators";
import {
  posts,
  postLikes,
  postReposts,
  postBookmarks,
  profiles,
  feedItems,
  follows,
  postEdits,
  comments,
  films,
  userBlocks,
  userMutes,
} from "@35mm/db/schema";
import { getDb } from "../../lib/db.js";
import { getOptionalAuthUser, requireAuth } from "../../lib/middleware.js";
import { ApiError, badRequest, forbidden, notFound } from "../../lib/errors.js";
import { decodeCompositeCursor, encodeCompositeCursor } from "../../lib/cursor.js";
import { isValidUlid } from "../../lib/ulid.js";
import { resolvePublicMediaUrl } from "../media/url.js";

export var feedRoutes = new Hono();

function isDbError(err: unknown): err is { code?: unknown; message?: unknown } {
  return err != null && typeof err === "object";
}

function toActionError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isDbError(err)) {
    var code = typeof err.code === "string" ? err.code : "DB_ERROR";
    var message = typeof err.message === "string" ? err.message : "Database error";
    return new ApiError(400, code, message);
  }
  return new ApiError(500, "INTERNAL_ERROR", "Something went wrong");
}

type CreatePostInput = {
  type: "text" | "discussion" | "log" | "review" | "image";
  headline: string | null;
  body: string;
  filmId: string | null;
  visibility: "public" | "followers_only" | "private";
  media: Array<{
    type: "image" | "video" | "film_embed" | "none";
    url: string;
    thumbnailUrl?: string;
    altText?: string;
  }>;
  mediaUrls: string[];
  linkPreview: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
};

function parseCreatePostInput(raw: unknown): CreatePostInput {
  var parsed = createPostSchema.parse(raw);
  var source = (raw ?? {}) as Record<string, unknown>;
  var visibilityRaw = source.visibility;
  var visibility: CreatePostInput["visibility"] = "public";

  if (visibilityRaw !== undefined) {
    if (
      visibilityRaw !== "public" &&
      visibilityRaw !== "followers_only" &&
      visibilityRaw !== "private"
    ) {
      throw badRequest("Invalid visibility");
    }
    visibility = visibilityRaw;
  }

  var filmId: string | null = null;
  if (typeof source.filmId === "string" && source.filmId.trim().length > 0) {
    filmId = source.filmId.trim();
  } else if (parsed.film?.id) {
    filmId = parsed.film.id;
  }

  if (filmId && !isValidUlid(filmId)) {
    throw new ApiError(400, "INVALID_FILM_ID", "film.id must be a 35mm ULID");
  }

  return {
    type: parsed.type,
    headline: parsed.headline ?? null,
    body: parsed.body,
    filmId,
    visibility,
    media: (parsed.media ?? []).slice(0, 10),
    mediaUrls: Array.isArray(source.mediaUrls)
      ? source.mediaUrls.filter(function (value): value is string {
          return typeof value === "string" && value.trim().length > 0;
        }).slice(0, 9)
      : [],
    linkPreview:
      source.linkPreview && typeof source.linkPreview === "object"
        ? {
            url: String((source.linkPreview as Record<string, unknown>).url ?? ""),
            title: String((source.linkPreview as Record<string, unknown>).title ?? ""),
            description:
              (source.linkPreview as Record<string, unknown>).description == null
                ? null
                : String((source.linkPreview as Record<string, unknown>).description),
            image:
              (source.linkPreview as Record<string, unknown>).image == null
                ? null
                : String((source.linkPreview as Record<string, unknown>).image),
            domain: String((source.linkPreview as Record<string, unknown>).domain ?? ""),
            provider:
              (source.linkPreview as Record<string, unknown>).provider === "youtube" ||
              (source.linkPreview as Record<string, unknown>).provider === "vimeo"
                ? ((source.linkPreview as Record<string, unknown>).provider as "youtube" | "vimeo")
                : "link",
          }
        : null,
  };
}

function parsePatchPostInput(raw: unknown): { headline?: string | null; body?: string; filmId?: string | null } {
  if (!raw || typeof raw !== "object") {
    throw badRequest("Invalid payload");
  }

  var source = raw as Record<string, unknown>;
  var hasHeadline = Object.prototype.hasOwnProperty.call(source, "headline");
  var hasBody = Object.prototype.hasOwnProperty.call(source, "body");
  var hasFilmId = Object.prototype.hasOwnProperty.call(source, "filmId");
  if (!hasHeadline && !hasBody && !hasFilmId) {
    throw badRequest("Provide headline and/or body and/or filmId");
  }

  var out: { headline?: string | null; body?: string; filmId?: string | null } = {};

  if (hasHeadline) {
    if (source.headline === null) {
      out.headline = null;
    } else if (typeof source.headline === "string") {
      var headline = source.headline.trim();
      if (headline.length < 1 || headline.length > 120) {
        throw badRequest("Headline must be 1-120 chars or null");
      }
      out.headline = headline;
    } else {
      throw badRequest("Headline must be string or null");
    }
  }

  if (hasBody) {
    if (typeof source.body !== "string") {
      throw badRequest("Body must be string");
    }
    var body = source.body.trim();
    if (body.length < 1 || body.length > 5000) {
      throw badRequest("Body must be 1-5000 characters");
    }
    out.body = body;
  }

  if (hasFilmId) {
    if (source.filmId === null) {
      out.filmId = null;
    } else if (typeof source.filmId === "string") {
      var filmId = source.filmId.trim();
      if (!isValidUlid(filmId)) {
        throw badRequest("filmId must be a 35mm ULID");
      }
      out.filmId = filmId;
    } else {
      throw badRequest("filmId must be a string ULID or null");
    }
  }

  return out;
}

function parseCreateCommentInput(raw: unknown): { body: string; parentId: string | null } {
  if (!raw || typeof raw !== "object") {
    throw badRequest("Invalid payload");
  }

  var source = raw as Record<string, unknown>;
  if (typeof source.body !== "string") {
    throw badRequest("Comment body must be string");
  }
  var body = source.body.trim();
  if (body.length < 1 || body.length > 1000) {
    throw badRequest("Comment body must be 1-1000 characters");
  }

  if (
    source.parentId !== undefined &&
    source.parentId !== null &&
    (typeof source.parentId !== "string" || source.parentId.length === 0)
  ) {
    throw badRequest("Invalid parent comment id");
  }

  return {
    body,
    parentId: typeof source.parentId === "string" ? source.parentId : null,
  };
}

function postVisibilitySql(viewerUserId: string | null) {
  if (!viewerUserId) {
    return eq(posts.visibility, "public");
  }

  return sql<boolean>`(
    ${posts.visibility} = 'public'
    or ${posts.userId} = ${viewerUserId}
    or (
      ${posts.visibility} = 'followers_only'
      and exists (
        select 1
        from ${follows}
        where ${follows.followerId} = ${viewerUserId}
          and ${follows.followingId} = ${posts.userId}
          and ${follows.status} = 'accepted'
      )
    )
  )`;
}

function profileAccessSql(viewerUserId: string | null) {
  if (!viewerUserId) {
    return eq(profiles.isPrivate, false);
  }

  return sql<boolean>`(
    ${profiles.isPrivate} = false
    or ${profiles.userId} = ${viewerUserId}
    or exists (
      select 1
      from ${follows}
      where ${follows.followerId} = ${viewerUserId}
        and ${follows.followingId} = ${profiles.userId}
        and ${follows.status} = 'accepted'
    )
  )`;
}

function compositeCursorSql(createdAtColumn: unknown, idColumn: unknown, cursor: { createdAt: Date; id: string } | null) {
  if (!cursor) return undefined;

  return or(
    lt(createdAtColumn as any, cursor.createdAt),
    and(eq(createdAtColumn as any, cursor.createdAt), lt(idColumn as any, cursor.id))
  );
}

async function toPostItem(row: {
  id: string;
  type: "text" | "discussion" | "log" | "review" | "image";
  headline: string | null;
  body: string;
  visibility: "public" | "followers_only" | "private";
  filmId: string | null;
  filmTmdbId: number | null;
  filmTitle: string | null;
  filmYear: number | null;
  filmPosterUrl: string | null;
  filmGenres: string[] | null;
  media: Array<{
    type: "image" | "video" | "film_embed" | "none";
    url: string;
    thumbnailUrl?: string;
    altText?: string;
  }>;
  mediaUrls: string[] | null;
  linkPreview: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string | null;
  roleContext: string | null;
  profileHeadline: string | null;
  profileHeadlineContext: string | null;
  filmsLoggedCount: number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  isDeleted: boolean;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
}) {
  var avatarUrl = await resolvePublicMediaUrl(row.avatarUrl);
  var mediaItems = Array.isArray(row.media) ? row.media : [];
  var resolvedMedia = await Promise.all(
    mediaItems.map(async function (item) {
      if (!item || typeof item !== "object") return null;
      var urlValue = (item as { url?: unknown }).url;
      if (typeof urlValue !== "string" || urlValue.trim().length === 0) {
        return null;
      }

      var thumbnailValue = (item as { thumbnailUrl?: unknown }).thumbnailUrl;
      var resolvedUrl = await resolvePublicMediaUrl(urlValue);
      var resolvedThumbnailUrl = await resolvePublicMediaUrl(
        typeof thumbnailValue === "string" ? thumbnailValue : null
      );

      return {
        ...item,
        url: resolvedUrl ?? urlValue,
        ...(resolvedThumbnailUrl ? { thumbnailUrl: resolvedThumbnailUrl } : {}),
      };
    })
  );
  var resolvedMediaUrls = await Promise.all(
    (row.mediaUrls ?? []).map(async function (url) {
      var resolved = await resolvePublicMediaUrl(url);
      return resolved ?? url;
    })
  );
  var resolvedLinkPreviewImage = row.linkPreview?.image
    ? await resolvePublicMediaUrl(row.linkPreview.image)
    : null;

  return {
    id: row.id,
    type: row.type,
    headline: row.headline,
    body: row.body,
    visibility: row.visibility,
    media: resolvedMedia.filter(function (item): item is NonNullable<typeof item> {
      return item !== null;
    }),
    mediaUrls: resolvedMediaUrls,
    linkPreview: row.linkPreview
      ? {
          ...row.linkPreview,
          image: resolvedLinkPreviewImage ?? row.linkPreview.image,
        }
      : null,
    film: row.filmId
      ? {
          id: row.filmId,
          tmdbId: row.filmTmdbId ?? undefined,
          title: row.filmTitle ?? "Unknown",
          year: row.filmYear,
          posterUrl: row.filmPosterUrl,
          genres: row.filmGenres ?? [],
          rating: null,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    isDeleted: row.isDeleted,
    author: {
      id: row.authorId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl,
      role: row.role ?? row.profileHeadline,
      roleContext: row.roleContext ?? row.profileHeadlineContext,
      filmsLoggedCount: Number(row.filmsLoggedCount ?? 0),
    },
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    repostCount: Number(row.repostCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
    isLiked: Boolean(row.isLiked),
    isReposted: Boolean(row.isReposted),
    isBookmarked: Boolean(row.isBookmarked),
  };
}

async function getPostById(postId: string, viewerUserId: string | null) {
  var db = getDb();
  var rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      isLiked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isReposted: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isBookmarked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.isDeleted, false),
        postVisibilitySql(viewerUserId),
        profileAccessSql(viewerUserId)
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  return toPostItem(rows[0]);
}

async function assertPostOwner(postId: string, userId: string) {
  var db = getDb();
  var rows = await db
    .select({
      id: posts.id,
      userId: posts.userId,
      isDeleted: posts.isDeleted,
      body: posts.body,
      headline: posts.headline,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (rows.length === 0) {
    throw notFound("Post not found");
  }

  if (rows[0].userId !== userId) {
    throw forbidden("You can only modify your own posts");
  }

  return rows[0];
}

async function assertReadablePost(postId: string, viewerUserId: string | null) {
  var post = await getPostById(postId, viewerUserId);
  if (!post) throw notFound("Post not found");
  return post;
}

async function assertReadablePostForInteraction(postId: string, viewerUserId: string | null) {
  void viewerUserId;
  var db = getDb();
  var rows = await db
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.isDeleted, false)
      )
    )
    .limit(1);

  if (rows.length === 0) throw notFound("Post not found");
}

feedRoutes.get("/", async function (c) {
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });

  var cursor = decodeCompositeCursor(parsed.cursor);
  var db = getDb();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));

  if (viewer) {
    var filters: any[] = [
      eq(feedItems.userId, viewer.userId),
      eq(posts.isDeleted, false),
      postVisibilitySql(viewer.userId),
      profileAccessSql(viewer.userId),
      sql<boolean>`not exists(select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${viewer.userId} and ${userBlocks.blockedId} = ${posts.userId})`,
      sql<boolean>`not exists(select 1 from ${userBlocks} where ${userBlocks.blockerId} = ${posts.userId} and ${userBlocks.blockedId} = ${viewer.userId})`,
      sql<boolean>`not exists(select 1 from ${userMutes} where ${userMutes.muterId} = ${viewer.userId} and ${userMutes.mutedId} = ${posts.userId})`,
    ];

    var cursorFilter = compositeCursorSql(feedItems.createdAt, feedItems.id, cursor);
    if (cursorFilter) filters.push(cursorFilter);

    var rows = await db
      .select({
        cursorCreatedAt: feedItems.createdAt,
        cursorId: feedItems.id,
        id: posts.id,
        type: posts.type,
        headline: posts.headline,
        body: posts.body,
        visibility: posts.visibility,
        filmId: posts.filmId,
        filmTmdbId: films.tmdbId,
        filmTitle: films.title,
        filmYear: films.year,
        filmPosterUrl: films.posterUrl,
        filmGenres: films.genres,
        media: posts.media,
        mediaUrls: posts.mediaUrls,
        linkPreview: posts.linkPreview,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        editedAt: posts.editedAt,
        authorId: profiles.userId,
        username: profiles.username,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        role: profiles.role,
        roleContext: profiles.roleContext,
        profileHeadline: profiles.headline,
        profileHeadlineContext: profiles.headlineContext,
        filmsLoggedCount: profiles.filmsLoggedCount,
        likeCount: posts.likeCount,
        commentCount: posts.commentCount,
        repostCount: posts.repostCount,
        bookmarkCount: posts.bookmarkCount,
        isDeleted: posts.isDeleted,
        isLiked: sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${viewer.userId})`,
        isReposted: sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${viewer.userId})`,
        isBookmarked: sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${viewer.userId})`,
      })
      .from(feedItems)
      .innerJoin(posts, eq(posts.id, feedItems.postId))
      .innerJoin(profiles, eq(profiles.userId, posts.userId))
      .leftJoin(films, eq(films.id, posts.filmId))
      .where(and(...filters))
      .orderBy(desc(feedItems.createdAt), desc(feedItems.id))
      .limit(parsed.limit + 1);

    var visibleRows = rows.slice(0, parsed.limit);
    var items = await Promise.all(visibleRows.map(toPostItem));

    var hasMore = rows.length > parsed.limit;
    var tail = visibleRows[visibleRows.length - 1];
    var nextCursor = hasMore && tail
      ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
      : null;

    return c.json({ items, nextCursor, hasMore });
  }

  // Guest (unauthenticated) feed reads directly from posts table ordered by created_at.
  // Authenticated feed reads from feed_items (materialized fan-out).
  // This is intentional — do not unify without implementing public feed_items writes.
  var guestFilters: any[] = [
    eq(posts.isDeleted, false),
    eq(posts.visibility, "public"),
    eq(profiles.isPrivate, false),
  ];
  var guestCursorFilter = compositeCursorSql(posts.createdAt, posts.id, cursor);
  if (guestCursorFilter) guestFilters.push(guestCursorFilter);

  var guestRows = await db
    .select({
      cursorCreatedAt: posts.createdAt,
      cursorId: posts.id,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      isLiked: sql<boolean>`false`,
      isReposted: sql<boolean>`false`,
      isBookmarked: sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...guestFilters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(parsed.limit + 1);

  var guestVisibleRows = guestRows.slice(0, parsed.limit);
  var guestItems = await Promise.all(guestVisibleRows.map(toPostItem));

  var guestHasMore = guestRows.length > parsed.limit;
  var guestTail = guestVisibleRows[guestVisibleRows.length - 1];
  var guestNextCursor = guestHasMore && guestTail
    ? encodeCompositeCursor({ createdAt: guestTail.cursorCreatedAt, id: guestTail.cursorId })
    : null;

  return c.json({ items: guestItems, nextCursor: guestNextCursor, hasMore: guestHasMore });
});

feedRoutes.post("/", requireAuth, async function (c) {
  var user = c.get("user");
  var input = parseCreatePostInput(await c.req.json());
  var db = getDb();
  var normalizedMedia =
    input.media.length > 0
      ? input.media
      : input.mediaUrls.map(function (url) {
          var lower = url.toLowerCase();
          var type: "image" | "video" | "film_embed" | "none" = "image";
          if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("video")) {
            type = "video";
          }
          return { type, url };
        });

  if (input.filmId) {
    var filmRows = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.id, input.filmId))
      .limit(1);

    if (filmRows.length === 0) {
      throw notFound("Film not found");
    }
  }

  var insertedRows = await db
    .insert(posts)
    .values({
      userId: user.userId,
      type: input.type,
      headline: input.headline ?? null,
      body: input.body,
      filmId: input.filmId ?? null,
      visibility: input.visibility,
      media: normalizedMedia,
      mediaUrls: input.mediaUrls,
      linkPreview: input.linkPreview,
    })
    .returning({ id: posts.id });

  var postId = insertedRows[0]?.id;
  if (!postId) {
    throw badRequest("Unable to create post");
  }

  // Worker fanout not wired yet; synchronous insert into feed_items.
  var followerRows = input.visibility === "private"
    ? []
    : await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(and(eq(follows.followingId, user.userId), eq(follows.status, "accepted")));

  var targetUserIds = new Set<string>();
  targetUserIds.add(user.userId);
  for (var follower of followerRows) {
    targetUserIds.add(follower.followerId);
  }

  if (targetUserIds.size > 0) {
    await db.insert(feedItems).values(
      Array.from(targetUserIds).map(function (targetUserId) {
        return {
          userId: targetUserId,
          postId,
          score: null,
        };
      })
    );
  }

  var created = await getPostById(postId, user.userId);
  if (!created) {
    throw notFound("Created post not found");
  }

  return c.json(created, 201);
});

feedRoutes.get("/posts/:postId", async function (c) {
  var postId = c.req.param("postId");
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var post = await assertReadablePost(postId, viewer?.userId ?? null);
  return c.json(post);
});

feedRoutes.get("/profiles/:username/posts", async function (c) {
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var username = c.req.param("username").toLowerCase().trim();
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));
  var viewerUserId = viewer?.userId ?? null;
  var db = getDb();

  var profileRows = await db
    .select({
      userId: profiles.userId,
      isPrivate: profiles.isPrivate,
    })
    .from(profiles)
    .where(eq(profiles.username, username))
    .limit(1);

  if (profileRows.length === 0) {
    throw notFound("Profile not found");
  }

  var profileRow = profileRows[0];
  if (profileRow.isPrivate && viewerUserId !== profileRow.userId) {
    if (!viewerUserId) {
      throw new ApiError(403, "PRIVATE_ACCOUNT", "This account is private");
    }

    var followRows = await db
      .select({ status: follows.status })
      .from(follows)
      .where(and(eq(follows.followerId, viewerUserId), eq(follows.followingId, profileRow.userId)))
      .limit(1);

    if (followRows[0]?.status !== "accepted") {
      throw new ApiError(403, "PRIVATE_ACCOUNT", "This account is private");
    }
  }

  var filters: any[] = [
    eq(profiles.username, username),
    eq(posts.isDeleted, false),
    postVisibilitySql(viewerUserId),
    profileAccessSql(viewerUserId),
  ];
  var cursorFilter = compositeCursorSql(posts.createdAt, posts.id, cursor);
  if (cursorFilter) filters.push(cursorFilter);

  var rows = await db
    .select({
      cursorCreatedAt: posts.createdAt,
      cursorId: posts.id,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      isLiked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isReposted: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
      isBookmarked: viewerUserId
        ? sql<boolean>`exists(select 1 from ${postBookmarks} where ${postBookmarks.postId} = ${posts.id} and ${postBookmarks.userId} = ${viewerUserId})`
        : sql<boolean>`false`,
    })
    .from(posts)
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(visibleRows.map(toPostItem));
  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

feedRoutes.get("/bookmarks", requireAuth, async function (c) {
  var user = c.get("user");
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var db = getDb();

  var filters: any[] = [
    eq(postBookmarks.userId, user.userId),
    eq(posts.isDeleted, false),
    postVisibilitySql(user.userId),
    profileAccessSql(user.userId),
  ];
  var cursorFilter = compositeCursorSql(postBookmarks.createdAt, postBookmarks.postId, cursor);
  if (cursorFilter) filters.push(cursorFilter);

  var rows = await db
    .select({
      cursorCreatedAt: postBookmarks.createdAt,
      cursorId: postBookmarks.postId,
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      visibility: posts.visibility,
      filmId: posts.filmId,
      filmTmdbId: films.tmdbId,
      filmTitle: films.title,
      filmYear: films.year,
      filmPosterUrl: films.posterUrl,
      filmGenres: films.genres,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      editedAt: posts.editedAt,
      authorId: profiles.userId,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      role: profiles.role,
      roleContext: profiles.roleContext,
      profileHeadline: profiles.headline,
      profileHeadlineContext: profiles.headlineContext,
      filmsLoggedCount: profiles.filmsLoggedCount,
      likeCount: posts.likeCount,
      commentCount: posts.commentCount,
      repostCount: posts.repostCount,
      bookmarkCount: posts.bookmarkCount,
      isDeleted: posts.isDeleted,
      isLiked: sql<boolean>`exists(select 1 from ${postLikes} where ${postLikes.postId} = ${posts.id} and ${postLikes.userId} = ${user.userId})`,
      isReposted: sql<boolean>`exists(select 1 from ${postReposts} where ${postReposts.postId} = ${posts.id} and ${postReposts.userId} = ${user.userId})`,
      isBookmarked: sql<boolean>`true`,
    })
    .from(postBookmarks)
    .innerJoin(posts, eq(posts.id, postBookmarks.postId))
    .innerJoin(profiles, eq(profiles.userId, posts.userId))
    .leftJoin(films, eq(films.id, posts.filmId))
    .where(and(...filters))
    .orderBy(desc(postBookmarks.createdAt), desc(postBookmarks.postId))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(visibleRows.map(toPostItem));
  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

feedRoutes.delete("/posts/:postId", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertPostOwner(postId, user.userId);

  var db = getDb();
  await db
    .update(posts)
    .set({
      isDeleted: true,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.userId, user.userId)));

  return c.json({ ok: true });
});

feedRoutes.patch("/posts/:postId", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var input = parsePatchPostInput(await c.req.json());
  var db = getDb();

  var current = await assertPostOwner(postId, user.userId);
  if (current.isDeleted) {
    throw badRequest("Cannot edit deleted post");
  }

  var headline = input.headline !== undefined ? input.headline : current.headline;
  var body = input.body !== undefined ? input.body : current.body;
  var filmIdToPersist = input.filmId;

  if (filmIdToPersist !== undefined && filmIdToPersist !== null) {
    var filmRows = await db
      .select({ id: films.id })
      .from(films)
      .where(eq(films.id, filmIdToPersist))
      .limit(1);

    if (filmRows.length === 0) {
      throw notFound("Film not found");
    }
  }

  await db.transaction(async function (tx) {
    await tx.insert(postEdits).values({
      postId,
      headline: current.headline,
      body: current.body,
      editedAt: new Date(),
    });

    await tx
      .update(posts)
      .set({
        headline,
        body,
        ...(filmIdToPersist !== undefined ? { filmId: filmIdToPersist } : {}),
        editedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  });

  var updated = await getPostById(postId, user.userId);
  if (!updated) throw notFound("Post not found");

  return c.json(updated);
});

feedRoutes.post("/posts/:postId/likes", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  try {
    await assertReadablePostForInteraction(postId, user.userId);

    var db = getDb();

    var inserted = await db
      .insert(postLikes)
      .values({ postId: postId, userId: user.userId })
      .onConflictDoNothing()
      .returning({ postId: postLikes.postId });

    if (inserted.length > 0) {
      await db
        .update(posts)
        .set({
          likeCount: sql`${posts.likeCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));
    }

    var countRows = await db
      .select({ likeCount: posts.likeCount })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    return c.json({ likeCount: Number(countRows[0]?.likeCount ?? 0) });
  } catch (err) {
    throw toActionError(err);
  }
});

feedRoutes.delete("/posts/:postId/likes", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();

  var deleted = await db
    .delete(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.userId)))
    .returning({ postId: postLikes.postId });

  if (deleted.length > 0) {
    await db
      .update(posts)
      .set({
        likeCount: sql`greatest(${posts.likeCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  }

  var countRows = await db
    .select({ likeCount: posts.likeCount })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  return c.json({ likeCount: Number(countRows[0]?.likeCount ?? 0) });
});

feedRoutes.post("/posts/:postId/reposts", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);
  var db = getDb();

  var sourceRows = await db
    .select({
      id: posts.id,
      type: posts.type,
      headline: posts.headline,
      body: posts.body,
      filmId: posts.filmId,
      media: posts.media,
      mediaUrls: posts.mediaUrls,
      linkPreview: posts.linkPreview,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.isDeleted, false)))
    .limit(1);

  if (sourceRows.length === 0) {
    throw notFound("Post not found");
  }

  var inserted = await db
    .insert(postReposts)
    .values({ postId: postId, userId: user.userId })
    .onConflictDoNothing()
    .returning({ postId: postReposts.postId });

  if (inserted.length > 0) {
    await db
      .update(posts)
      .set({
        repostCount: sql`${posts.repostCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    var sourcePost = sourceRows[0];
    var repostInsertRows = await db
      .insert(posts)
      .values({
        userId: user.userId,
        type: sourcePost.type,
        headline: sourcePost.headline,
        body: sourcePost.body,
        filmId: sourcePost.filmId,
        visibility: "public",
        media: sourcePost.media,
        mediaUrls: sourcePost.mediaUrls ?? [],
        linkPreview: sourcePost.linkPreview,
        isRepost: true,
        replyToId: postId,
      })
      .returning({ id: posts.id });

    var repostPostId = repostInsertRows[0]?.id;
    if (repostPostId) {
      var followerRows = await db
        .select({ followerId: follows.followerId })
        .from(follows)
        .where(and(eq(follows.followingId, user.userId), eq(follows.status, "accepted")));

      var targetUserIds = new Set<string>();
      targetUserIds.add(user.userId);
      for (var follower of followerRows) {
        targetUserIds.add(follower.followerId);
      }

      if (targetUserIds.size > 0) {
        await db.insert(feedItems).values(
          Array.from(targetUserIds).map(function (targetUserId) {
            return {
              userId: targetUserId,
              postId: repostPostId,
              score: null,
            };
          })
        );
      }
    }
  }

  return c.json({ ok: true });
});

feedRoutes.delete("/posts/:postId/reposts", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);
  var db = getDb();

  var deleted = await db
    .delete(postReposts)
    .where(and(eq(postReposts.postId, postId), eq(postReposts.userId, user.userId)))
    .returning({ postId: postReposts.postId });

  if (deleted.length > 0) {
    await db
      .update(posts)
      .set({
        repostCount: sql`greatest(${posts.repostCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    await db
      .update(posts)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(posts.userId, user.userId),
          eq(posts.replyToId, postId),
          eq(posts.isRepost, true),
          eq(posts.isDeleted, false)
        )
      );
  }

  return c.json({ ok: true });
});

feedRoutes.post("/posts/:postId/bookmarks", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  try {
    await assertReadablePostForInteraction(postId, user.userId);
    var db = getDb();

    var inserted = await db
      .insert(postBookmarks)
      .values({ postId: postId, userId: user.userId })
      .onConflictDoNothing()
      .returning({ postId: postBookmarks.postId });

    if (inserted.length > 0) {
      await db
        .update(posts)
        .set({
          bookmarkCount: sql`${posts.bookmarkCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));
    }

    return c.json({ ok: true });
  } catch (err) {
    throw toActionError(err);
  }
});

feedRoutes.delete("/posts/:postId/bookmarks", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  await assertReadablePostForInteraction(postId, user.userId);
  var db = getDb();

  var deleted = await db
    .delete(postBookmarks)
    .where(and(eq(postBookmarks.postId, postId), eq(postBookmarks.userId, user.userId)))
    .returning({ postId: postBookmarks.postId });

  if (deleted.length > 0) {
    await db
      .update(posts)
      .set({
        bookmarkCount: sql`greatest(${posts.bookmarkCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));
  }

  return c.json({ ok: true });
});

// Comments are returned as a flat list with parentId for client-side tree construction.
// Max depth: 3 levels, enforced on write. Do not change to nested API response
// without updating the client tree builder in features/feed/api/adapters.ts.
feedRoutes.get("/posts/:postId/comments", async function (c) {
  var postId = c.req.param("postId");
  var parsed = cursorPaginationSchema.parse({
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  });
  var cursor = decodeCompositeCursor(parsed.cursor);
  var viewer = await getOptionalAuthUser(c.req.header("Authorization"));

  await assertReadablePost(postId, viewer?.userId ?? null);

  var db = getDb();
  var filters: any[] = [eq(comments.postId, postId)];
  var cursorFilter = compositeCursorSql(comments.createdAt, comments.id, cursor);
  if (cursorFilter) filters.push(cursorFilter);

  var rows = await db
    .select({
      cursorCreatedAt: comments.createdAt,
      cursorId: comments.id,
      id: comments.id,
      postId: comments.postId,
      userId: comments.userId,
      parentId: comments.parentId,
      body: comments.body,
      likeCount: comments.likeCount,
      isDeleted: comments.isDeleted,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.userId))
    .where(and(...filters))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(parsed.limit + 1);

  var visibleRows = rows.slice(0, parsed.limit);
  var items = await Promise.all(
    visibleRows.map(async function (row) {
      return {
        id: row.id,
        postId: row.postId,
        parentId: row.parentId,
        body: row.isDeleted ? null : row.body,
        isDeleted: row.isDeleted,
        likeCount: Number(row.likeCount ?? 0),
        editedAt: row.editedAt ? row.editedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        author: {
          id: row.userId,
          username: row.username,
          displayName: row.displayName,
          avatarUrl: await resolvePublicMediaUrl(row.avatarUrl),
        },
      };
    })
  );

  var hasMore = rows.length > parsed.limit;
  var tail = visibleRows[visibleRows.length - 1];
  var nextCursor = hasMore && tail
    ? encodeCompositeCursor({ createdAt: tail.cursorCreatedAt, id: tail.cursorId })
    : null;

  return c.json({ items, nextCursor, hasMore });
});

async function getCommentDepth(postId: string, commentId: string): Promise<number> {
  var db = getDb();
  var depth = 1;
  var currentId: string | null = commentId;

  while (currentId) {
    var rows: Array<{ parentId: string | null }> = await db
      .select({ parentId: comments.parentId })
      .from(comments)
      .where(and(eq(comments.id, currentId), eq(comments.postId, postId)))
      .limit(1);

    if (rows.length === 0) {
      throw badRequest("Invalid parent comment");
    }

    var parentId: string | null = rows[0].parentId;
    if (!parentId) break;

    depth += 1;
    currentId = parentId;

    if (depth > 3) break;
  }

  return depth;
}

feedRoutes.post("/posts/:postId/comments", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var input = parseCreateCommentInput(await c.req.json());

  await assertReadablePostForInteraction(postId, user.userId);

  if (input.parentId) {
    var parentDepth = await getCommentDepth(postId, input.parentId);
    if (parentDepth >= 3) {
      throw badRequest("Comments support max 3 levels");
    }

    var db = getDb();
    var parentRows = await db
      .select({ isDeleted: comments.isDeleted })
      .from(comments)
      .where(and(eq(comments.id, input.parentId), eq(comments.postId, postId)))
      .limit(1);

    if (parentRows.length === 0) {
      throw badRequest("Parent comment not found");
    }

    if (parentRows[0].isDeleted) {
      throw badRequest("Cannot reply to deleted comment");
    }
  }

  var db = getDb();
  var insertedRows = await db.transaction(async function (tx) {
    var inserted = await tx
      .insert(comments)
      .values({
        postId,
        userId: user.userId,
        parentId: input.parentId ?? null,
        body: input.body,
      })
      .returning({
        id: comments.id,
        postId: comments.postId,
        userId: comments.userId,
        parentId: comments.parentId,
        body: comments.body,
        likeCount: comments.likeCount,
        isDeleted: comments.isDeleted,
        editedAt: comments.editedAt,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      });

    await tx
      .update(posts)
      .set({
        commentCount: sql`${posts.commentCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, postId));

    return inserted;
  });

  var inserted = insertedRows[0];
  if (!inserted) {
    throw badRequest("Unable to create comment");
  }

  var profileRows = await db
    .select({
      username: profiles.username,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  if (profileRows.length === 0) {
    throw notFound("Profile not found");
  }

  return c.json(
    {
      id: inserted.id,
      postId: inserted.postId,
      parentId: inserted.parentId,
      body: inserted.body,
      isDeleted: inserted.isDeleted,
      likeCount: Number(inserted.likeCount ?? 0),
      editedAt: inserted.editedAt ? inserted.editedAt.toISOString() : null,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
      author: {
        id: inserted.userId,
        username: profileRows[0].username,
        displayName: profileRows[0].displayName,
        avatarUrl: await resolvePublicMediaUrl(profileRows[0].avatarUrl),
      },
    },
    201
  );
});

feedRoutes.delete("/posts/:postId/comments/:commentId", requireAuth, async function (c) {
  var user = c.get("user");
  var postId = c.req.param("postId");
  var commentId = c.req.param("commentId");

  await assertReadablePostForInteraction(postId, user.userId);

  var db = getDb();
  var currentRows = await db
    .select({
      id: comments.id,
      userId: comments.userId,
      isDeleted: comments.isDeleted,
    })
    .from(comments)
    .where(and(eq(comments.id, commentId), eq(comments.postId, postId)))
    .limit(1);

  if (currentRows.length === 0) {
    throw notFound("Comment not found");
  }

  var current = currentRows[0];
  if (current.userId !== user.userId) {
    throw forbidden("You can only delete your own comments");
  }

  if (!current.isDeleted) {
    await db.transaction(async function (tx) {
      await tx
        .update(comments)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(eq(comments.id, commentId));

      await tx
        .update(posts)
        .set({
          commentCount: sql`greatest(${posts.commentCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));
    });
  }

  return c.json({ ok: true });
});
