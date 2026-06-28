export type UserId = string;
export {
  computeFeedScore,
  FEED_SCORE_COMMENT_WEIGHT,
  FEED_SCORE_ENGAGEMENT_WEIGHT,
  FEED_SCORE_RECENCY_HALF_LIFE_HOURS,
  FEED_SCORE_RECENCY_WEIGHT,
  FEED_SCORE_REPOST_WEIGHT,
  type FeedScoreInput,
} from "./feedScoring.js";
export {
  DEFAULT_FEED_ITEMS_RETENTION_DAYS,
  feedItemsRetentionBoundary,
  parseFeedItemsRetentionDays,
} from "./feedRetention.js";

export type PostId = string;
export type ConversationId = string;
export type MessageId = string;
export type OnboardingRole =
  | "cinephile"
  | "creator"
  | "critic"
  | "film_student"
  | "industry";

export interface PublicUser {
  id: UserId;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  avatarUrlLg?: string | null;
  role?: string | null;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
}

export interface PublicProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  coverUrl: string | null;
  location: string | null;
  website: string | null;
  dateOfBirth: string | null;
  role: string | null;
  roleContext: string | null;
  headline: string | null;
  headlineContext: string | null;
  favoriteFilmIds: string[];
  favoriteGenreIds: string[];
  filmsLoggedCount: number;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  isDeactivated: boolean;
  createdAt: string;
}

export interface PrivacySettings {
  privateAccount: boolean;
  allowMessagesFromAnyone: boolean;
  showActivityStatus: boolean;
}

export interface NotificationSettings {
  newFollowers: boolean;
  likesOnPosts: boolean;
  commentsAndReplies: boolean;
  mentions: boolean;
  festivalUpdates: boolean;
  watchlistStreaming: boolean;
  emailDigest: boolean;
  emailPreferences: NotificationEmailPreferences;
}

export interface NotificationEmailPreferences {
  likesOnPosts: boolean;
  repostsOnPosts: boolean;
  newFollowers: boolean;
  followRequests: boolean;
  followRequestApproved: boolean;
  comments: boolean;
  replies: boolean;
  mentions: boolean;
  filmLogged: boolean;
}

export interface UserSettingsResponse {
  privacy: PrivacySettings;
  notifications: NotificationSettings;
}

export interface FeedPost {
  id: PostId;
  author: PublicUser;
  type: "text" | "discussion" | "log" | "review" | "image";
  headline?: string | null;
  body: string;
  media: Array<{
    type: "image" | "video" | "film_embed" | "none";
    url: string;
    key?: string;
    thumbnailUrl?: string;
    altText?: string;
    width?: number;
    height?: number;
    blurhash?: string;
    variants?: {
      thumb?: string;
      feed?: string;
      full?: string;
    };
  }>;
  film: {
    id: string;
    title: string;
    year: number | null;
    posterUrl: string | null;
    genres: string[];
    rating: number | null;
  } | null;
  poll: {
    id: string;
    type: "ranking" | "image";
    resultsVisibility: "after_vote" | "after_end";
    endsAt: string;
    totalVotes: number;
    hasVoted: boolean;
    isEnded: boolean;
    resultsVisible: boolean;
    selectedOptionIds: string[];
    options: Array<{
      id: string;
      label: string | null;
      imageUrl: string | null;
      position: number;
      voteCount: number | null;
      percent: number | null;
    }>;
  } | null;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  bookmarkFolderId?: string | null;
}

export interface FeedPage {
  items: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface FilmListFilm {
  id: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
}

export interface FilmListEntry {
  id: string;
  film: FilmListFilm;
  position: number | null;
  note: string | null;
  addedAt: string;
}

export interface FilmListSummary {
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
  isLiked: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  owner: PublicUser;
  posterUrls: Array<string | null>;
}

export interface FilmListDetail extends FilmListSummary {
  entries: FilmListEntry[];
  clonedFromListId: string | null;
}

export interface FilmListPage {
  items: FilmListSummary[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface WatchlistStatus {
  filmId: string;
  isInWatchlist: boolean;
  watchlistId: string;
  entryId: string | null;
}

export interface ChatPreview {
  id: ConversationId;
  name: string;
  username: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export interface ChatMessage {
  id: MessageId;
  conversationId: ConversationId;
  sender: PublicUser;
  text: string;
  createdAt: string;
}

export interface HealthResponse {
  ok: true;
  service: string;
  version: string;
  feedCache?: "ok" | "disabled";
  jobsQueue?: "ok" | "disabled";
}

export type NotificationType =
  | "like"
  | "comment"
  | "reply"
  | "follow"
  | "follow_request"
  | "follow_request_approved"
  | "mention"
  | "repost"
  | "film_logged";

export interface NotificationActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
}

export interface NotificationEntity {
  type: "post" | "comment" | "user" | "film" | null;
  id: string | null;
  title: string | null;
  thumbnailUrl: string | null;
  /** Owner username for post/comment entities to help link navigation client-side. */
  username?: string | null;
  /** Target post id for comment entities, when available. */
  postId?: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actor: NotificationActor | null;
  entity: NotificationEntity | null;
  isRead: boolean;
  actorIds?: string[];
  actorProfiles?: {
    userId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    avatarUrlLg?: string | null;
  }[];
  bundleCount: number;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationUnreadCount {
  count: number;
}

export type { FollowSuggestion, SuggestionsResponse } from "./suggestions.js";
