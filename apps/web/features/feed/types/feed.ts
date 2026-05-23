export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
  /** Badge label e.g. "Director", "Cinephile". When absent, role headline is hidden. */
  role?: string | null;
  /** Free-text context except Cinephile — see `filmsLoggedCount`. */
  roleContext?: string | null;
  /** Only for role "Cinephile": shown as "{n} films logged". */
  filmsLoggedCount?: number | null;
}

export interface FilmRef {
  tmdbId: number;
  title: string;
  year: number;
  posterUrl: string | null;
  genres: string[];
  rating: number | null;
}

export type PostMediaType = "image" | "video" | "film_embed" | "none";

export interface PostMedia {
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
}

export interface Post {
  id: string;
  author: Author;
  /** Discussion-style title. When set, `body` is only the post body (not the title). */
  headline?: string;
  body: string;
  media: PostMedia[];
  film: FilmRef | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  saveCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  body: string;
  likeCount: number;
  isLiked: boolean;
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
