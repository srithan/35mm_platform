"use client";

import { ReplyComposerPanel } from "../ReplyComposer/ReplyComposerPanel";

interface CommentCardReplyComposerProps {
  open: boolean;
  depth: number;
  username: string;
  displayName?: string;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function CommentCardReplyComposer({
  open,
  depth,
  username,
  displayName,
  replyText,
  onReplyTextChange,
  onSubmit,
  onCancel,
}: CommentCardReplyComposerProps) {
  if (!open || depth >= 2) return null;

  return (
    <ReplyComposerPanel
      replyToHandle={username}
      replyToName={displayName}
      value={replyText}
      onChange={onReplyTextChange}
      onSubmit={onSubmit}
      onCancel={onCancel}
      placeholder={`Reply to @${username}…`}
      variant="nested"
      className="mt-1 border-0 bg-transparent p-0 shadow-none"
    />
  );
}
