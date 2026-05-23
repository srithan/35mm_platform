import { EXTENDED_MOCK_POSTS } from "../data/mockPosts";
import type { FeedPage, Post } from "../types/feed";
import { adaptPostToFeedType } from "./adapters";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Shown first on every feed load (order preserved). IDs match adapted `Post.id`. */
const FEED_PINNED_POST_IDS: readonly string[] = [
  "project-hail-mary-casting",
  "female-directors-venom",
  "sinners-truefilm",
  "6",
];

function buildFeedOrder(posts: Post[]): Post[] {
  const pinnedSet = new Set(FEED_PINNED_POST_IDS);
  const pinned = FEED_PINNED_POST_IDS.map((id) => posts.find((p) => p.id === id)).filter(
    (p): p is Post => p != null
  );
  const rest = posts.filter((p) => !pinnedSet.has(p.id));
  return pinned.concat(rest);
}

export interface FetchFeedParams {
  cursor?: string;
  limit?: number;
}

export async function fetchFeed(params: FetchFeedParams): Promise<FeedPage> {
  await delay(rand(200, 400));

  if (Math.random() < 0.05) {
    throw new Error("Feed temporarily unavailable");
  }

  const limit = params.limit ?? 10;
  const posts = EXTENDED_MOCK_POSTS.map(adaptPostToFeedType);
  const sortedPosts = buildFeedOrder(posts);

  const startIndex = params.cursor
    ? sortedPosts.findIndex((post) => post.id === params.cursor) + 1
    : 0;
  const page = sortedPosts.slice(startIndex, startIndex + limit);
  const nextPost = sortedPosts[startIndex + limit];

  return {
    posts: page,
    nextCursor: nextPost ? nextPost.id : null,
    hasMore: Boolean(nextPost),
  };
}
