import type { FeedPage } from "@/features/feed/types/feed";
import { adaptPostToFeedType } from "@/features/feed/api/adapters";
import { MOCK_COMMUNITIES, MOCK_COMMUNITY_POSTS } from "../data/mockCommunities";
import type { CommunitiesPage, CommunityDetail } from "../types/community";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export interface FetchCommunitiesParams {
  cursor?: string;
  limit?: number;
}

export interface FetchCommunityFeedParams {
  slug: string;
  cursor?: string;
  limit?: number;
}

const postById = new Map(MOCK_COMMUNITY_POSTS.map((post) => [post.id, post]));

function toSummary(community: CommunityDetail) {
  const { moderators, postIds, headContributorId, ...summary } = community;
  return summary;
}

export async function fetchCommunities(
  params: FetchCommunitiesParams = {}
): Promise<CommunitiesPage> {
  await delay(rand(180, 380));

  if (Math.random() < 0.04) {
    throw new Error("Communities temporarily unavailable");
  }

  const limit = params.limit ?? 9;
  const sorted = [...MOCK_COMMUNITIES].sort((a, b) => b.memberCount - a.memberCount);
  const startIndex = params.cursor
    ? sorted.findIndex((community) => community.id === params.cursor) + 1
    : 0;
  const page = sorted.slice(startIndex, startIndex + limit);
  const nextCommunity = sorted[startIndex + limit];

  return {
    communities: page.map(toSummary),
    nextCursor: nextCommunity ? nextCommunity.id : null,
    hasMore: Boolean(nextCommunity),
  };
}

export async function fetchCommunityBySlug(slug: string): Promise<CommunityDetail> {
  await delay(rand(150, 320));

  const community = MOCK_COMMUNITIES.find((item) => item.slug === slug);
  if (!community) {
    throw new Error("Community not found");
  }

  return community;
}

export async function fetchCommunityFeed(
  params: FetchCommunityFeedParams
): Promise<FeedPage> {
  await delay(rand(180, 420));

  const community = MOCK_COMMUNITIES.find((item) => item.slug === params.slug);
  if (!community) {
    throw new Error("Community feed unavailable");
  }

  const limit = params.limit ?? 10;
  const rawPosts = community.postIds
    .map((postId) => postById.get(postId))
    .filter((post): post is NonNullable<typeof post> => Boolean(post));

  const posts = rawPosts.map(adaptPostToFeedType);
  const startIndex = params.cursor
    ? posts.findIndex((post) => post.id === params.cursor) + 1
    : 0;
  const page = posts.slice(startIndex, startIndex + limit);
  const nextPost = posts[startIndex + limit];

  return {
    posts: page,
    nextCursor: nextPost ? nextPost.id : null,
    hasMore: Boolean(nextPost),
  };
}
