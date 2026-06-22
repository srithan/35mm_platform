export interface Comment {
  id: string;
  parentId?: string | null;
  isDeleted?: boolean;
  authorId?: string;
  username: string;
  /** Display name (defaults to username) */
  displayName?: string;
  avatarUrl?: string | null;
  avatarInitial: string;
  avatarBg?: string;
  avatarColor?: string;
  role?: string | null;
  roleContext?: string | null;
  filmsLoggedCount?: number | null;
  text: string;
  timestamp: string;
  likeCount: number;
  liked?: boolean;
  replyCount: number;
  replies?: Comment[];
}

export interface CommentCardProps {
  comment: Comment;
  postId: string;
  postBookmarked?: boolean;
  postBookmarkFolderId?: string | null;
  depth?: number;
  onReplySubmit?: (input: { parentId: string; body: string }) => Promise<void>;
}

export function getCommentThreadStyles(depth: number) {
  const threadLevel = Math.min(depth, 6);
  const threadInsetPx = threadLevel * 6;

  return {
    threadInsetPx,
    containerStyle:
      depth > 0
        ? {
            marginLeft: `${threadInsetPx}px`,
            paddingLeft: "8px",
          }
        : {},
  };
}
