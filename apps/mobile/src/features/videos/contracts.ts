import type {
  FeedPost,
  FeedPage,
  VideoAssetStatus,
  VideoPlaybackResult,
  VideoUploadCredentials,
} from "@35mm/types";

function record(value: unknown, contract: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function nullableNumber(value: unknown, field: string): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number or null.`);
  }
  return value;
}

function count(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
  return value as number;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
  return value;
}

export function parseVideoAssetStatus(value: unknown): VideoAssetStatus {
  const source = record(value, "VideoAssetStatus");
  const state = source.state;
  if (!["creating", "uploading", "processing", "ready", "failed"].includes(String(state))) {
    throw new Error("VideoAssetStatus.state is invalid.");
  }
  return {
    id: string(source.id, "VideoAssetStatus.id"),
    state: state as VideoAssetStatus["state"],
    failureReason:
      source.failureReason === null
        ? null
        : string(source.failureReason, "VideoAssetStatus.failureReason"),
    durationSeconds: nullableNumber(source.durationSeconds, "VideoAssetStatus.durationSeconds"),
    width: nullableNumber(source.width, "VideoAssetStatus.width"),
    height: nullableNumber(source.height, "VideoAssetStatus.height"),
    filmId: source.filmId === null ? null : string(source.filmId, "VideoAssetStatus.filmId"),
    postId: source.postId === null ? null : string(source.postId, "VideoAssetStatus.postId"),
  };
}

export function parseVideoUploadSession(
  value: unknown,
): VideoUploadCredentials | VideoAssetStatus {
  const status = parseVideoAssetStatus(value);
  if (status.state === "ready" || status.state === "processing" || status.state === "failed") {
    return status;
  }
  const source = record(value, "VideoUploadCredentials");
  const endpoint = string(source.endpoint, "VideoUploadCredentials.endpoint");
  const parsedEndpoint = new URL(endpoint);
  if (parsedEndpoint.protocol !== "https:" || parsedEndpoint.hostname !== "video.bunnycdn.com") {
    throw new Error("VideoUploadCredentials.endpoint is not trusted.");
  }
  return {
    ...status,
    endpoint,
    libraryId: string(source.libraryId, "VideoUploadCredentials.libraryId"),
    videoId: string(source.videoId, "VideoUploadCredentials.videoId"),
    expires: count(source.expires, "VideoUploadCredentials.expires"),
    signature: string(source.signature, "VideoUploadCredentials.signature"),
  };
}

export function parseVideoPlayback(value: unknown): VideoPlaybackResult {
  const source = record(value, "VideoPlaybackResult");
  const width = nullableNumber(source.width, "VideoPlaybackResult.width");
  const height = nullableNumber(source.height, "VideoPlaybackResult.height");
  if (source.state === "processing" || source.state === "failed") {
    return {
      state: source.state,
      message: string(source.message, "VideoPlaybackResult.message"),
      width,
      height,
    };
  }
  const embedUrl = string(source.embedUrl, "VideoPlayback.embedUrl");
  const posterUrl = string(source.posterUrl, "VideoPlayback.posterUrl");
  for (const [field, url] of [["embedUrl", embedUrl], ["posterUrl", posterUrl]] as const) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") throw new Error(`VideoPlayback.${field} must use HTTPS.`);
    if (field === "embedUrl" && parsed.hostname !== "iframe.mediadelivery.net") {
      throw new Error("VideoPlayback.embedUrl host is not trusted.");
    }
    if (field === "posterUrl" && !parsed.hostname.endsWith(".b-cdn.net")) {
      throw new Error("VideoPlayback.posterUrl host is not trusted.");
    }
  }
  return {
    embedUrl,
    posterUrl,
    expires: count(source.expires, "VideoPlayback.expires"),
    width,
    height,
  };
}

function parseFeedPost(value: unknown): FeedPost {
  const source = record(value, "FeedPost");
  const author = record(source.author, "FeedPost.author");
  if (!["text", "discussion", "log", "review", "image"].includes(String(source.type))) {
    throw new Error("FeedPost.type is invalid.");
  }
  if (!Array.isArray(source.media)) throw new Error("FeedPost.media must be an array.");
  const media = source.media.map((entry, index) => {
    const item = record(entry, `FeedPost.media[${index}]`);
    const type = item.type;
    if (!["image", "video", "film_embed", "none"].includes(String(type))) {
      throw new Error(`FeedPost.media[${index}].type is invalid.`);
    }
    return {
      type: type as FeedPost["media"][number]["type"],
      url: string(item.url, `FeedPost.media[${index}].url`),
      ...(typeof item.videoAssetId === "string" ? { videoAssetId: item.videoAssetId } : {}),
      ...(typeof item.width === "number" ? { width: item.width } : {}),
      ...(typeof item.height === "number" ? { height: item.height } : {}),
    };
  });
  return {
    ...(source as unknown as FeedPost),
    id: string(source.id, "FeedPost.id"),
    author: {
      ...(author as unknown as FeedPost["author"]),
      id: string(author.id, "FeedPost.author.id"),
      username: string(author.username, "FeedPost.author.username"),
      displayName: string(author.displayName, "FeedPost.author.displayName"),
    },
    body: typeof source.body === "string" ? source.body : "",
    type: source.type as FeedPost["type"],
    media,
    createdAt: string(source.createdAt, "FeedPost.createdAt"),
    updatedAt: string(source.updatedAt, "FeedPost.updatedAt"),
    likeCount: count(source.likeCount, "FeedPost.likeCount"),
    commentCount: count(source.commentCount, "FeedPost.commentCount"),
    repostCount: count(source.repostCount, "FeedPost.repostCount"),
    bookmarkCount: count(source.bookmarkCount, "FeedPost.bookmarkCount"),
    quoteCount: source.quoteCount == null ? 0 : count(source.quoteCount, "FeedPost.quoteCount"),
    isLiked: boolean(source.isLiked, "FeedPost.isLiked"),
    isReposted: boolean(source.isReposted, "FeedPost.isReposted"),
    isBookmarked: boolean(source.isBookmarked, "FeedPost.isBookmarked"),
    quotedPostUnavailable: boolean(source.quotedPostUnavailable, "FeedPost.quotedPostUnavailable"),
  };
}

export function parseFeedPage(value: unknown): FeedPage {
  const source = record(value, "FeedPage");
  if (!Array.isArray(source.items)) throw new Error("FeedPage.items must be an array.");
  if (typeof source.hasMore !== "boolean") throw new Error("FeedPage.hasMore must be a boolean.");
  if (source.nextCursor !== null && typeof source.nextCursor !== "string") {
    throw new Error("FeedPage.nextCursor must be a string or null.");
  }
  return {
    items: source.items.map(parseFeedPost),
    hasMore: source.hasMore,
    nextCursor: source.nextCursor as string | null,
  };
}
