export type PostVariant = "text" | "film-log" | "image" | "discussion";
export type SourcePostType = "text" | "discussion" | "log" | "review" | "image";

export interface PostCardFilmCard {
  title: string;
  year: number;
  genre?: string;
  posterUrl?: string | null;
  /** Stored as 1–10 int; displayed as half-stars (÷2 → 0.5–5.0). */
  rating?: number;
}

export interface PostCardAttachedFilm {
  id: string;
  tmdbId?: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
}

export interface PostCardMediaItem {
  type: "image" | "video" | "film_embed" | "none";
  url: string;
  blurhash?: string;
  variants?: {
    thumb?: string;
    feed?: string;
    full?: string;
  };
}

export interface PostCardLinkPreview {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
  provider: "youtube" | "vimeo" | "link";
}

export interface PostCardReplyPreview {
  username: string;
  text: string;
  time: string;
}

export interface PostCardPoll {
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
}

export interface PostCardProps {
  variant: PostVariant;
  sourcePostType?: SourcePostType;
  username: string;
  userId?: string;
  handle: string;
  postId?: string;
  /** Display name for UsernameLink (defaults to username). Use slug as username for links when different. */
  displayName?: string;
  timestamp: string;
  avatarInitial: string;
  /** When set, shown instead of the initial pill (e.g. mock feed portraits). */
  avatarUrl?: string | null;
  avatarBg?: string;
  avatarColor?: string;
  /** Discussion headline (shown above `text` / body). */
  headline?: string;
  text: string;
  filmRef?: string;
  filmCard?: PostCardFilmCard;
  attachedFilm?: PostCardAttachedFilm | null;
  imageSrc?: string;
  imageCaption?: string;
  media?: PostCardMediaItem[];
  mediaUrls?: string[];
  viewerMediaUrls?: string[];
  poll?: PostCardPoll | null;
  saveData?: boolean;
  linkPreview?: PostCardLinkPreview | null;
  likeCount: number;
  liked?: boolean;
  bookmarked?: boolean;
  reposted?: boolean;
  commentCount: number;
  replyPreview?: PostCardReplyPreview;
  replyCount?: number;
  animationDelay?: number;
  disableAnimation?: boolean;
  tab?: string;
  role?: string | null;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
}

export interface PostCardAuthorProps {
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
  avatarInitial: string;
  avatarBg?: string;
  avatarColor?: string;
  handle: string;
  role?: string | null;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
}
