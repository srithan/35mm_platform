import type { FeedPage } from "@/features/feed/types/feed";

export type CommunityAccessType = "public" | "restricted" | "private";

export interface CommunityAvatar {
  initial: string;
  gradient: string;
  textColor: string;
}

export interface CommunityCover {
  gradient: string;
}

export interface CommunityModerator {
  id: string;
  username: string;
  displayName: string;
  role: "head-contributor" | "moderator";
  avatar: CommunityAvatar;
}

export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  createdAt: string;
  memberCount: number;
  accessType: CommunityAccessType;
  isMature: boolean;
  avatar: CommunityAvatar;
  cover: CommunityCover;
  topics: string[];
}

export interface CommunityDetail extends CommunitySummary {
  moderators: CommunityModerator[];
  headContributorId: string;
  postIds: string[];
}

export interface CommunitiesPage {
  communities: CommunitySummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type CommunityFeedPage = FeedPage;
