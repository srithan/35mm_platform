import type { Comment, Post } from "../types/feed";

var ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    var parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(function (item): item is string {
    return typeof item === "string";
  });
}

function normalizePoll(raw: Record<string, unknown>): Post["poll"] {
  if (!isRecord(raw.poll)) return null;
  var poll = raw.poll;
  var type = asString(poll.type);
  if (type !== "ranking" && type !== "image") return null;
  var optionsRaw = Array.isArray(poll.options) ? poll.options : [];
  var options = optionsRaw
    .filter(isRecord)
    .map(function (option) {
      var percentRaw = option.percent;
      var voteCountRaw = option.voteCount;
      return {
        id: asString(option.id),
        label: option.label == null ? null : asString(option.label),
        imageUrl: option.imageUrl == null ? null : asString(option.imageUrl),
        position: asNumber(option.position, 0),
        voteCount: voteCountRaw == null ? null : asNumber(voteCountRaw, 0),
        percent: percentRaw == null ? null : asNumber(percentRaw, 0),
      };
    })
    .filter(function (option) {
      return option.id.length > 0;
    });

  var resultsVisibility: "after_vote" | "after_end" = asString(poll.resultsVisibility) === "after_end" ? "after_end" : "after_vote";
  return {
    id: asString(poll.id),
    type,
    resultsVisibility,
    endsAt: asString(poll.endsAt),
    totalVotes: asNumber(poll.totalVotes, 0),
    hasVoted: Boolean(poll.hasVoted),
    isEnded: Boolean(poll.isEnded),
    resultsVisible: Boolean(poll.resultsVisible),
    selectedOptionIds: asStringArray(poll.selectedOptionIds),
    options,
  };
}

function asUlid(value: unknown): string {
  var candidate = asString(value);
  return ULID_RE.test(candidate) ? candidate : "";
}

function toRelativeTime(iso: string): string {
  var then = Date.parse(iso);
  if (Number.isNaN(then)) return "now";
  var diff = Date.now() - then;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function normalizeMedia(raw: Record<string, unknown>): Post["media"] {
  if (Array.isArray(raw.media)) {
    var normalized: Post["media"] = [];
    for (var i = 0; i < raw.media.length; i += 1) {
      var item = raw.media[i];
      if (!isRecord(item)) continue;

      var type = asString(item.type);
      if (
        type !== "image" &&
        type !== "video" &&
        type !== "film_embed" &&
        type !== "none"
      ) {
        continue;
      }

      var url = asString(item.url);
      if (!url) continue;

      var next: Post["media"][number] = { type, url };
      var key = asString(item.key);
      var thumbnailUrl = asString(item.thumbnailUrl);
      var altText = asString(item.altText);
      var blurhash = asString(item.blurhash);
      var width = asNumber(item.width, 0);
      var height = asNumber(item.height, 0);
      var variants = isRecord(item.variants) ? item.variants : null;
      var thumbVariant = variants ? asString(variants.thumb) : "";
      var feedVariant = variants ? asString(variants.feed) : "";
      var fullVariant = variants ? asString(variants.full) : "";
      if (key) next.key = key;
      if (thumbnailUrl) next.thumbnailUrl = thumbnailUrl;
      if (altText) next.altText = altText;
      if (blurhash) next.blurhash = blurhash;
      if (width > 0) next.width = width;
      if (height > 0) next.height = height;
      if (thumbVariant || feedVariant || fullVariant) {
        next.variants = {};
        if (thumbVariant) next.variants.thumb = thumbVariant;
        if (feedVariant) next.variants.feed = feedVariant;
        if (fullVariant) next.variants.full = fullVariant;
      }
      normalized.push(next);
    }
    return normalized;
  }

  var mediaUrls = asStringArray(raw.mediaUrls);
  if (mediaUrls.length > 0) {
    return mediaUrls.map(function (url) {
      var lower = url.toLowerCase();
      var type: Post["media"][number]["type"] = "image";
      if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.includes("video")) {
        type = "video";
      }
      return { type, url };
    });
  }

  var imageSrc = asString(raw.imageSrc);
  if (!imageSrc) return [];
  return [{ type: "image", url: imageSrc, altText: asString(raw.imageCaption) || undefined }];
}

export function adaptPostToFeedType(raw: unknown): Post {
  var root = isRecord(raw) ? raw : {};
  var authorRaw = isRecord(root.author) ? root.author : {};

  var username =
    asString(authorRaw.username) ||
    asString(root.username) ||
    asString(root.handle).replace(/^@/, "") ||
    "unknown";
  var displayName =
    asString(authorRaw.displayName) ||
    asString(root.displayName) ||
    username;

  var createdAt = asString(root.createdAt) || new Date().toISOString();
  var updatedAt = asString(root.updatedAt) || createdAt;
  var media = normalizeMedia(root);
  var mediaUrls = asStringArray(root.mediaUrls);
  var poll = normalizePoll(root);

  var film: Post["film"] = null;
  if (isRecord(root.film)) {
    var filmId = asUlid(root.film.id);
    if (filmId) {
      film = {
        id: filmId,
        tmdbId: asNumber(root.film.tmdbId, NaN),
        title: asString(root.film.title, "Unknown"),
        year: root.film.year == null ? null : asNumber(root.film.year, 0),
        posterUrl: asNullableString(root.film.posterUrl),
        genres: asStringArray(root.film.genres),
        rating: root.film.rating == null ? null : asNumber(root.film.rating, 0),
      };

      if (!Number.isFinite(film.tmdbId as number)) {
        delete film.tmdbId;
      }
    }
  } else if (isRecord(root.filmCard)) {
    var filmCardTitle = asString(root.filmCard.title, "Unknown");
    var filmCardId = asUlid(root.filmCard.id);
    if (filmCardId) {
      film = {
        id: filmCardId,
        tmdbId: Number.isFinite(asNumber(root.filmCard.tmdbId, NaN))
          ? asNumber(root.filmCard.tmdbId, NaN)
          : undefined,
        title: filmCardTitle,
        year: null,
        posterUrl: asNullableString(root.filmCard.posterSrc),
        genres: [],
        rating: root.filmCard.rating == null ? null : asNumber(root.filmCard.rating, 0),
      };
    }
  }

  var typeRaw = asString(root.type) || asString(root.variant);
  var type: Post["type"] = "text";
  if (typeRaw === "discussion") type = "discussion";
  else if (typeRaw === "log" || typeRaw === "film-log") type = "log";
  else if (typeRaw === "review") type = "review";
  else if (typeRaw === "image") type = "image";

  return {
    id: asString(root.id),
    type,
    visibility:
      asString(root.visibility) === "followers_only" ||
      asString(root.visibility) === "private"
        ? (asString(root.visibility) as "followers_only" | "private")
        : "public",
    editedAt: asNullableString(root.editedAt),
    isDeleted: Boolean(root.isDeleted),
    author: {
      id: asString(authorRaw.id) || asString(root.userId) || username,
      username,
      displayName,
      avatarUrl: asNullableString(authorRaw.avatarUrl) ?? asNullableString(root.avatarUrl),
      isFollowing: Boolean(authorRaw.isFollowing),
      role: asNullableString(authorRaw.role) ?? asNullableString(root.role),
      roleContext:
        asNullableString(authorRaw.roleContext) ?? asNullableString(root.roleContext),
      filmsLoggedCount:
        authorRaw.filmsLoggedCount == null
          ? root.filmsLoggedCount == null
            ? null
            : asNumber(root.filmsLoggedCount, 0)
          : asNumber(authorRaw.filmsLoggedCount, 0),
    },
    headline: asString(root.headline) || undefined,
    body: asString(root.body) || asString(root.content) || asString(root.text),
    media,
    mediaUrls,
    linkPreview: isRecord(root.linkPreview)
      ? {
          url: asString(root.linkPreview.url),
          title: asString(root.linkPreview.title),
          description:
            root.linkPreview.description == null
              ? null
              : asString(root.linkPreview.description),
          image: root.linkPreview.image == null ? null : asString(root.linkPreview.image),
          domain: asString(root.linkPreview.domain),
          provider:
            root.linkPreview.provider === "youtube" || root.linkPreview.provider === "vimeo"
              ? root.linkPreview.provider
              : "link",
        }
      : null,
    poll,
    film,
    likeCount: asNumber(root.likeCount, asNumber(root.likes, 0)),
    commentCount: asNumber(root.commentCount, 0),
    repostCount: asNumber(root.repostCount, asNumber(root.reposts, 0)),
    bookmarkCount: asNumber(root.bookmarkCount, 0),
    isLiked: Boolean(root.isLiked ?? root.liked),
    isReposted: Boolean(root.isReposted),
    isBookmarked: Boolean(root.isBookmarked),
    createdAt,
    updatedAt,
    __raw: {
      variant: type === "log" || type === "review" ? "film-log" : type,
      timestamp: asString(root.timestamp) || toRelativeTime(createdAt),
      liked: Boolean(root.isLiked ?? root.liked),
      imageSrc: media.find(function (m) { return m.type === "image"; })?.url,
      imageCaption: media.find(function (m) { return m.type === "image"; })?.altText,
      filmCard: film
        ? {
            title: film.title,
            year: film.year ?? 0,
            genre: film.genres[0],
            posterUrl: film.posterUrl,
            rating: film.rating == null ? undefined : Math.round(film.rating * 2),
          }
        : undefined,
      tags: asStringArray(root.tags),
    },
  } as Post;
}

type CommentDto = {
  id: string;
  postId: string;
  parentId: string | null;
  body: string | null;
  isDeleted?: boolean;
  likeCount: number;
  editedAt?: string | null;
  createdAt: string;
  isLiked?: boolean;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role?: string | null;
    roleContext?: string | null;
    filmsLoggedCount?: number | null;
  };
};

export function buildCommentTree(items: CommentDto[]): Comment[] {
  var byId = new Map<string, Comment>();
  var roots: Comment[] = [];

  for (var i = 0; i < items.length; i += 1) {
    var raw = items[i];

    byId.set(raw.id, {
      id: raw.id,
      postId: raw.postId,
      parentId: raw.parentId,
      depth: 0,
      body: raw.body,
      isDeleted: raw.isDeleted,
      likeCount: raw.likeCount,
      isLiked: Boolean(raw.isLiked),
      editedAt: raw.editedAt ?? null,
      createdAt: raw.createdAt,
      author: {
        id: raw.author.id,
        username: raw.author.username,
        displayName: raw.author.displayName,
        avatarUrl: raw.author.avatarUrl,
        isFollowing: false,
        role: raw.author.role,
        roleContext: raw.author.roleContext,
        filmsLoggedCount: raw.author.filmsLoggedCount,
      },
      replies: [],
      __raw: {
        timestamp: toRelativeTime(raw.createdAt),
      },
    } as Comment);
  }

  for (var j = 0; j < items.length; j += 1) {
    var rawItem = items[j];

    var current = byId.get(rawItem.id);
    if (!current) continue;

    if (rawItem.parentId) {
      var parent = byId.get(rawItem.parentId);
      if (parent) {
        current.depth = parent.depth + 1;
        parent.replies.push(current);
        continue;
      }
    }

    roots.push(current);
  }

  function pruneDeletedLeaves(list: Comment[]): Comment[] {
    return list
      .map(function (comment) {
        return {
          ...comment,
          replies: pruneDeletedLeaves(comment.replies),
        };
      })
      .filter(function (comment) {
        return !comment.isDeleted || comment.replies.length > 0;
      });
  }

  function sortNodeList(list: Comment[]) {
    list.sort(function (a, b) {
      return Date.parse(a.createdAt) - Date.parse(b.createdAt);
    });

    for (var k = 0; k < list.length; k += 1) {
      sortNodeList(list[k].replies);
    }
  }

  var prunedRoots = pruneDeletedLeaves(roots);
  sortNodeList(prunedRoots);
  return prunedRoots;
}
