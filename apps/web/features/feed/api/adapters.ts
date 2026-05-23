import { getMockPortraitUrlForUsername } from "@/lib/constants/mockPortraitUrl";
import { FEED_DISPLAY_NAMES } from "../data/mockPosts";
import { getCommentsForPost } from "../data/mockComments";
import type { Comment, Post } from "../types/feed";

/** Mock / legacy posts: real portrait when URL omitted; `null` means keep initials. */
function resolveAuthorAvatarUrl(raw: Record<string, unknown>, username: string): string | null {
  const author = raw.author;
  const fromAuthor =
    author != null && typeof author === "object"
      ? (author as { avatarUrl?: unknown }).avatarUrl
      : undefined;
  const fromRoot = raw.avatarUrl;
  const pick = fromAuthor !== undefined && fromAuthor !== null ? fromAuthor : fromRoot;
  if (pick === null) return null;
  if (typeof pick === "string" && pick.trim() !== "") return pick.trim();
  return getMockPortraitUrlForUsername(username);
}

function parseTimestampToIso(timestamp: string | undefined): string {
  if (!timestamp) return new Date().toISOString();
  if (!Number.isNaN(Date.parse(timestamp))) return new Date(timestamp).toISOString();

  const now = Date.now();
  const value = Number.parseInt(timestamp, 10);
  if (Number.isNaN(value)) return new Date().toISOString();

  if (timestamp.includes("m")) return new Date(now - value * 60_000).toISOString();
  if (timestamp.includes("h")) return new Date(now - value * 3_600_000).toISOString();
  if (timestamp.includes("d")) return new Date(now - value * 24 * 3_600_000).toISOString();
  return new Date().toISOString();
}

// Keep feed card counts aligned with the mock comment tree available in post detail.
// This avoids showing non-zero counts for posts that have no comment data.
function countComments(comments: unknown): number {
  if (!Array.isArray(comments)) return 0;
  return comments.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    const record = item as { replies?: unknown };
    return total + 1 + countComments(record.replies);
  }, 0);
}

function asRootRecord(raw: unknown): Record<string, unknown> {
  return raw != null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

/** Role fields may live on nested `author` or on the raw post/comment root (mock mocks). */
function pickFilmsLogged(
  authorObj: Record<string, unknown>,
  root: Record<string, unknown>
): number | undefined {
  const candidates = [authorObj.filmsLoggedCount, root.filmsLoggedCount];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (typeof c === "number" && !Number.isNaN(c)) return c;
    if (typeof c === "string" && c.trim() !== "") {
      const n = Number.parseInt(c, 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function pickRole(authorObj: Record<string, unknown>, root: Record<string, unknown>): string | undefined {
  const a = typeof authorObj.role === "string" ? authorObj.role.trim() : "";
  if (a) return a;
  const r = typeof root.role === "string" ? root.role.trim() : "";
  if (r) return r;
  return undefined;
}

function pickRoleContext(
  authorObj: Record<string, unknown>,
  root: Record<string, unknown>
): string | undefined {
  if (typeof authorObj.roleContext === "string") return authorObj.roleContext;
  if (typeof root.roleContext === "string") return root.roleContext;
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptPostToFeedType(raw: any): Post {
  const username = raw.author?.username ?? raw.username ?? raw.handle?.replace(/^@/, "") ?? "unknown";
  const displayName =
    raw.author?.displayName ?? raw.displayName ?? FEED_DISPLAY_NAMES[username] ?? username;
  const createdAt = parseTimestampToIso(raw.createdAt ?? raw.timestamp);
  const imageMedia =
    raw.imageSrc && typeof raw.imageSrc === "string"
      ? [{ type: "image" as const, url: raw.imageSrc, altText: raw.imageCaption }]
      : [];

  const availableComments = getCommentsForPost(String(raw.id)) ?? [];
  const syncedCommentCount = countComments(availableComments);

  const film =
    raw.filmCard && typeof raw.filmCard === "object"
      ? {
          tmdbId: 0,
          title: raw.filmCard.title ?? "Unknown",
          year: Number.parseInt(String(raw.filmCard.meta ?? "").match(/\d{4}/)?.[0] ?? "0", 10),
          posterUrl: raw.filmCard.posterSrc ?? null,
          genres: [],
          rating: raw.filmCard.rating ?? null,
        }
      : null;

  const headlineRaw = raw.headline;
  const headline =
    typeof headlineRaw === "string" && headlineRaw.trim().length > 0 ? headlineRaw.trim() : undefined;
  const body = headline
    ? (raw.body ?? raw.content ?? raw.text ?? "")
    : (raw.body ?? raw.content ?? raw.text ?? "");

  const rawAuthor =
    raw.author != null && typeof raw.author === "object"
      ? (raw.author as Record<string, unknown>)
      : {};
  const rootPost = asRootRecord(raw);
  const filmsLogged = pickFilmsLogged(rawAuthor, rootPost);

  return {
    id: String(raw.id),
    author: {
      id: raw.author?.id ?? raw.userId ?? username,
      username,
      displayName,
      avatarUrl: resolveAuthorAvatarUrl(raw as Record<string, unknown>, username),
      isFollowing: raw.author?.isFollowing ?? false,
      role: pickRole(rawAuthor, rootPost),
      roleContext: pickRoleContext(rawAuthor, rootPost),
      filmsLoggedCount: filmsLogged !== undefined && !Number.isNaN(filmsLogged) ? filmsLogged : undefined,
    },
    ...(headline ? { headline } : {}),
    body,
    media: imageMedia,
    film,
    likeCount: raw.likeCount ?? raw.likes ?? 0,
    commentCount: syncedCommentCount,
    repostCount: raw.repostCount ?? raw.reposts ?? 0,
    saveCount: raw.saveCount ?? 0,
    isLiked: raw.isLiked ?? raw.liked ?? false,
    isReposted: raw.isReposted ?? false,
    isSaved: raw.isSaved ?? false,
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
    __raw: raw,
  } as Post;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function adaptCommentToFeedType(raw: any, depth: number): Comment {
  const username = raw.author?.username ?? raw.username ?? raw.handle ?? "unknown";
  const displayName = raw.author?.displayName ?? raw.displayName ?? username;
  const rawCommentAuthor =
    raw.author != null && typeof raw.author === "object"
      ? (raw.author as Record<string, unknown>)
      : {};
  const rootComment = asRootRecord(raw);
  const filmsComment = pickFilmsLogged(rawCommentAuthor, rootComment);

  return {
    id: String(raw.id),
    postId: String(raw.postId ?? ""),
    parentId: raw.parentId ? String(raw.parentId) : null,
    depth,
    author: {
      id: raw.author?.id ?? raw.userId ?? username,
      username,
      displayName,
      avatarUrl: raw.author?.avatarUrl ?? null,
      isFollowing: false,
      role: pickRole(rawCommentAuthor, rootComment),
      roleContext: pickRoleContext(rawCommentAuthor, rootComment),
      filmsLoggedCount: filmsComment !== undefined && !Number.isNaN(filmsComment) ? filmsComment : undefined,
    },
    body: raw.body ?? raw.content ?? raw.text ?? "",
    likeCount: raw.likeCount ?? raw.likes ?? 0,
    isLiked: raw.isLiked ?? raw.liked ?? false,
    createdAt: raw.createdAt ?? raw.timestamp ?? new Date().toISOString(),
    replies: (raw.replies ?? []).map((reply: unknown) =>
      adaptCommentToFeedType(reply, depth + 1)
    ),
    __raw: raw,
  } as Comment;
}

