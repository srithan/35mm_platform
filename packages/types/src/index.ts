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

export interface FilmListEntriesPage {
  items: FilmListEntry[];
  nextCursor: string | null;
  hasMore: boolean;
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
  entriesPage?: FilmListEntriesPage;
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

export type CatalogEditStatus =
  | "pending_review"
  | "applied"
  | "rejected"
  | "reverted"
  | "superseded";

export type CatalogEditSource = "studio" | "contribution" | "import" | "system";

export type CatalogEntityType =
  | "title"
  | "person"
  | "credit"
  | "company"
  | "title_company"
  | "title_genre"
  | "award"
  | "award_event"
  | "award_nomination"
  | "media_asset"
  | "external_id"
  | "alias"
  | "title_relation"
  | "source";

export type CatalogRevisionAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "merge"
  | "split";

export interface CatalogEntityRef {
  entityType: CatalogEntityType;
  entityId: string;
}

export interface CatalogEditDto {
  id: string;
  status: CatalogEditStatus;
  source: CatalogEditSource;
  summary: string;
  publicVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogEditMutationResult {
  edit: CatalogEditDto;
  outcome: "created" | "applied" | "existing";
}

export interface CatalogEditWorkflowResult {
  edit: CatalogEditDto;
}

export type CatalogTitleType =
  | "movie"
  | "short_film"
  | "documentary"
  | "tv_series"
  | "web_series"
  | "tv_season"
  | "tv_episode"
  | "tv_special"
  | "video"
  | "other";

export type CatalogEntityStatus = "active" | "merged" | "deleted" | "locked";
export type CatalogCreditDepartment =
  | "cast"
  | "directing"
  | "writing"
  | "production"
  | "camera"
  | "editing"
  | "sound"
  | "music"
  | "art"
  | "costume"
  | "makeup"
  | "visual_effects"
  | "stunts"
  | "animation"
  | "crew"
  | "other";
export type CatalogMediaType =
  | "poster"
  | "backdrop"
  | "still"
  | "headshot"
  | "logo"
  | "trailer"
  | "clip"
  | "featurette"
  | "external_video";
export type CatalogExternalProvider =
  | "imdb"
  | "tmdb"
  | "wikidata"
  | "letterboxd"
  | "thetvdb"
  | "official_site"
  | "youtube"
  | "vimeo"
  | "instagram"
  | "wikipedia"
  | "other";

export interface CatalogMediaRow {
  id: string;
  entityType: CatalogEntityType;
  entityId: string;
  type: CatalogMediaType;
  source: string;
  url: string;
  storageKey: string | null;
  title: string | null;
  caption: string | null;
  language: string | null;
  region: string | null;
  rightsNote: string | null;
  attribution: string | null;
  metadata: Record<string, unknown>;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogExternalIdRow {
  id: string;
  entityType: CatalogEntityType;
  entityId: string;
  provider: CatalogExternalProvider;
  externalId: string;
  url: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAliasRow {
  id: string;
  entityType: CatalogEntityType;
  entityId: string;
  type: string;
  value: string;
  sortValue: string;
  language: string | null;
  region: string | null;
  attributes: string[];
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogTitleCard {
  id: string;
  type: CatalogTitleType;
  status: CatalogEntityStatus;
  primaryTitle: string;
  originalTitle: string | null;
  sortTitle: string;
  slug: string;
  startYear: number | null;
  endYear: number | null;
  releaseDate: string | null;
  runtimeMinutes: number | null;
  primaryLanguage: string | null;
  primaryCountry: string | null;
  isAdult: boolean;
  isVerified: boolean;
  primaryMedia: CatalogMediaRow | null;
}

export interface CatalogTitleDetail extends CatalogTitleCard {
  lifecycle: string;
  legacyFilmId: string | null;
  synopsis: string | null;
  originCountries: string[];
  spokenLanguages: string[];
  facts: Record<string, unknown>;
  parentTitleId: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  absoluteEpisodeNumber: number | null;
  mergedIntoTitleId: string | null;
  canonicalTitle: CatalogTitleCard | null;
  externalIds: CatalogExternalIdRow[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPersonCard {
  id: string;
  status: CatalogEntityStatus;
  primaryName: string;
  sortName: string;
  slug: string;
  birthDate: string | null;
  deathDate: string | null;
  primaryProfessions: string[];
  isVerified: boolean;
  primaryMedia: CatalogMediaRow | null;
}

export interface CatalogPersonDetail extends CatalogPersonCard {
  biography: string | null;
  birthPlace: string | null;
  deathPlace: string | null;
  gender: string | null;
  mergedIntoPersonId: string | null;
  canonicalPerson: CatalogPersonCard | null;
  externalIds: CatalogExternalIdRow[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCompanyCard {
  id: string;
  status: CatalogEntityStatus;
  type: string;
  name: string;
  sortName: string;
  slug: string;
  country: string | null;
  foundedYear: number | null;
  dissolvedYear: number | null;
  isVerified: boolean;
}

export interface CatalogCompanyDetail extends CatalogCompanyCard {
  description: string | null;
  officialUrl: string | null;
  mergedIntoCompanyId: string | null;
  canonicalCompany: CatalogCompanyCard | null;
  externalIds: CatalogExternalIdRow[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogCreditRow {
  id: string;
  titleId: string;
  personId: string;
  department: CatalogCreditDepartment;
  job: string;
  characterName: string | null;
  creditedAs: string | null;
  billingOrder: number;
  episodeCount: number | null;
  startYear: number | null;
  endYear: number | null;
  notes: string | null;
  title: CatalogTitleCard | null;
  person: CatalogPersonCard | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogRelationRow {
  id: string;
  fromTitleId: string;
  toTitleId: string;
  type: string;
  sortOrder: number;
  note: string | null;
  title: CatalogTitleCard;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogAwardRow {
  id: string;
  eventId: string;
  awardId: string;
  awardName: string;
  eventName: string;
  year: number;
  categoryName: string;
  outcome: string;
  creditedName: string | null;
  sortOrder: number;
}

export interface CatalogCompanyTitleRow {
  id: string;
  companyId: string;
  titleId: string;
  role: string;
  region: string | null;
  startDate: string | null;
  endDate: string | null;
  sortOrder: number;
  title: CatalogTitleCard;
}

export interface CatalogEditQueueItem extends CatalogEditDto {
  rationale: string | null;
  actorUserId: string | null;
  idempotencyKey: string | null;
  revertsEditId: string | null;
  revertedByEditId: string | null;
  entities: CatalogEntityRef[];
}

export interface CatalogHistoryItem extends CatalogEditDto {
  revisionId: string;
  entityType: CatalogEntityType;
  entityId: string;
  action: CatalogRevisionAction;
  changedFields: string[];
  createdAt: string;
}

export interface CatalogPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type CatalogTitlePage = CatalogPage<CatalogTitleCard>;
export type CatalogPersonPage = CatalogPage<CatalogPersonCard>;
export type CatalogCompanyPage = CatalogPage<CatalogCompanyCard>;
export type CatalogCreditPage = CatalogPage<CatalogCreditRow>;
export type CatalogMediaPage = CatalogPage<CatalogMediaRow>;
export type CatalogAliasPage = CatalogPage<CatalogAliasRow>;
export type CatalogRelationPage = CatalogPage<CatalogRelationRow>;
export type CatalogAwardPage = CatalogPage<CatalogAwardRow>;
export type CatalogCompanyTitlePage = CatalogPage<CatalogCompanyTitleRow>;
export type CatalogEditQueuePage = CatalogPage<CatalogEditQueueItem>;
export type CatalogHistoryPage = CatalogPage<CatalogHistoryItem>;

export type ContributionKind =
  | "add_title"
  | "edit_title"
  | "credits"
  | "person_update"
  | "media"
  | "awards_events"
  | "duplicate_titles"
  | "merge_people"
  | "split_person";

export type ContributionStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "rejected";

export interface ContributionSubmission {
  id: string;
  userId: string;
  kind: ContributionKind;
  title: string;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  status: ContributionStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
}

export interface ContributionSubmissionPage {
  items: ContributionSubmission[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type ChatThreadType = "dm" | "group";
export type ChatMessageContentType = "text" | "image" | "gif" | "file" | "link";

export interface ChatMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarVariants: Record<string, string> | null;
  role: "member" | "admin";
  joinedAt: string;
}

export interface MessageReplySnapshot {
  senderId: string;
  senderUsername: string;
  body: string | null;
  contentType: ChatMessageContentType;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  viewerReacted: boolean;
}

export interface ChatMessage {
  id: MessageId;
  threadId: string;
  bucket: number;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatarUrl: string | null;
  senderAvatarVariants: Record<string, string> | null;
  contentType: ChatMessageContentType;
  body: string | null;
  mediaUrl: string | null;
  mediaMetadata: {
    width?: number;
    height?: number;
    size?: number;
    mimeType?: string;
    blurhash?: string;
  } | null;
  linkPreview: {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    siteName?: string;
  } | null;
  replyToId: string | null;
  replySnapshot: MessageReplySnapshot | null;
  reactions: MessageReaction[];
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
}

export interface ChatThreadPreview {
  id: string;
  type: ChatThreadType;
  members: ChatMember[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastSenderId: string | null;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  deletedAt: string | null;
}

export interface ChatMessagesPage {
  items: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatInboxPage {
  items: ChatThreadPreview[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ChatTypingUser {
  userId: string;
  username: string;
  avatarUrl: string | null;
}

export interface ChatTypingSnapshot {
  typingUserIds: string[];
  items: ChatTypingUser[];
}

export interface ChatReadReceipt {
  userId: string;
  username: string;
  lastReadMessageId: string;
}

export interface ChatReadReceiptsResponse {
  items: ChatReadReceipt[];
}

export interface ChatPresenceState {
  userId: string;
  status: "online" | "offline";
  lastSeenAt: string | null;
}

export interface ChatPresenceBatchResponse {
  /** Backward-compatible boolean map used by older clients. */
  presence: Record<string, boolean>;
  users: Record<string, ChatPresenceState>;
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
  | "film_logged"
  | "chat_reaction";

export interface NotificationActor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
}

export interface NotificationEntity {
  type: "post" | "comment" | "user" | "film" | "chat_thread" | null;
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
