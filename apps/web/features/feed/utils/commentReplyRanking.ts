import type { Comment } from "../types/feed";

export const COMMENT_REPLY_PREVIEW_LIMIT = 3;

function parseCreatedAt(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function rankCommentReplies(replies: readonly Comment[]): Comment[] {
  return replies
    .map(function (reply, originalIndex) {
      return { reply, originalIndex };
    })
    .sort(function (left, right) {
      const likeDifference = right.reply.likeCount - left.reply.likeCount;
      if (likeDifference !== 0) return likeDifference;

      const recencyDifference =
        parseCreatedAt(right.reply.createdAt) - parseCreatedAt(left.reply.createdAt);
      if (recencyDifference !== 0) return recencyDifference;

      return left.originalIndex - right.originalIndex;
    })
    .map(function ({ reply }) {
      return reply;
    });
}
