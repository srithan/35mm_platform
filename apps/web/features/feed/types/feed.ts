export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarUrlLg?: string | null;
  isFollowing: boolean;
  /** Badge label e.g. "Director", "Cinephile". When absent, role headline is hidden. */
  role?: string | null;
  /** Free-text context except Cinephile — see `filmsLoggedCount`. */
  roleContext?: string | null;
  /** Only for role "Cinephile": shown as "{n} films logged". */
  filmsLoggedCount?: number | null;
}

export interface FilmRef {
  id: string;
  tmdbId?: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
}

export type PostMediaType = "image" | "video" | "film_embed" | "none";

export interface PostMedia {
  type: PostMediaType;
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
}

export interface Post {
  id: string;
  author: Author;
  type: "text" | "discussion" | "log" | "review" | "image";
  visibility?: "public" | "followers_only" | "private";
  editedAt?: string | null;
  isDeleted?: boolean;
  /** Discussion-style title. When set, `body` is only the post body (not the title). */
  headline?: string;
  body: string;
  media: PostMedia[];
  mediaUrls?: string[];
  linkPreview?: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
  poll?: {
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
  film: FilmRef | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  bookmarkCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  bookmarkFolderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  body: string | null;
  likeCount: number;
  isLiked: boolean;
  isDeleted?: boolean;
  editedAt?: string | null;
  createdAt: string;
  replies: Comment[];
  parentId: string | null;
  depth: number;
}

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CommentsResult {
  comments: Comment[];
  postId: string;
}
