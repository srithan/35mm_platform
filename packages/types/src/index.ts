export type UserId = string;
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
    tmdbId?: number;
    title: string;
    year: number | null;
    posterUrl: string | null;
    genres: string[];
    rating: number | null;
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
}

export interface FeedPage {
  items: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
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
