import type { Post } from "../types/feed";

type RepostContext = NonNullable<Post["repostContext"]>;
type RepostUser = RepostContext["user"];

function mergeRepostContexts(
  first: RepostContext | null,
  second: RepostContext | null,
  repostCount: number
): RepostContext | null {
  var contexts = [first, second].filter(function (value): value is RepostContext {
    return Boolean(value);
  });
  if (contexts.length === 0) return null;

  var users: RepostUser[] = [];
  var seen = new Set<string>();
  for (var context of contexts) {
    for (var user of context.users) {
      if (seen.has(user.id)) continue;
      seen.add(user.id);
      if (users.length < 2) users.push(user);
    }
  }

  var primary = contexts[0];
  return {
    ...primary,
    user: users[0] ?? primary.user,
    users: users.length > 0 ? users : [primary.user],
    totalCount: Math.max(
      repostCount,
      users.length,
      ...contexts.map(function (context) { return context.totalCount; })
    ),
    includesOriginal:
      !first
      || !second
      || contexts.some(function (context) { return context.includesOriginal; }),
  };
}

export function deduplicateFeedPosts(posts: Post[]): Post[] {
  var deduplicated: Post[] = [];
  var indexByPostId = new Map<string, number>();

  for (var post of posts) {
    var existingIndex = indexByPostId.get(post.id);
    if (existingIndex === undefined) {
      indexByPostId.set(post.id, deduplicated.length);
      deduplicated.push(post);
      continue;
    }

    var existing = deduplicated[existingIndex];
    var repostCount = Math.max(existing.repostCount, post.repostCount);
    deduplicated[existingIndex] = {
      ...existing,
      likeCount: Math.max(existing.likeCount, post.likeCount),
      commentCount: Math.max(existing.commentCount, post.commentCount),
      repostCount,
      bookmarkCount: Math.max(existing.bookmarkCount, post.bookmarkCount),
      isLiked: existing.isLiked || post.isLiked,
      isReposted: existing.isReposted || post.isReposted,
      isBookmarked: existing.isBookmarked || post.isBookmarked,
      bookmarkFolderId: existing.bookmarkFolderId ?? post.bookmarkFolderId ?? null,
      repostContext: mergeRepostContexts(
        existing.repostContext,
        post.repostContext,
        repostCount
      ),
    };
  }

  return deduplicated;
}
