"use client";

import { Avatar } from "@/components/Avatar";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { cn } from "@/lib/utils/cn";
import type { RefObject } from "react";

interface CommentCardReplyComposerProps {
  open: boolean;
  depth: number;
  username: string;
  replyText: string;
  replyTextareaRef: RefObject<HTMLTextAreaElement>;
  onReplyTextChange: (value: string, textarea: HTMLTextAreaElement) => void;
  onSubmit: () => void;
}

export function CommentCardReplyComposer({
  open,
  depth,
  username,
  replyText,
  replyTextareaRef,
  onReplyTextChange,
  onSubmit,
}: CommentCardReplyComposerProps) {
  if (!open || depth >= 2) return null;

  return (
    <div className="mt-2.5 ml-0.5">
      <div className="flex items-start gap-2">
        <Avatar
          initial={CURRENT_USER.initial}
          src={CURRENT_USER.avatarUrl}
          className="mt-1 w-8 h-8"
        />
        <div className="relative flex-1">
          <textarea
            ref={replyTextareaRef}
            value={replyText}
            placeholder={`Reply to ${username}...`}
            aria-label={`Reply to ${username}`}
            rows={1}
            onChange={(e) => onReplyTextChange(e.target.value, e.target)}
            className="w-full resize-none overflow-y-auto min-h-[42px] border border-border rounded-md pl-3 pr-16 py-2 text-[12.5px] leading-[1.45] text-fg bg-elevated outline-none placeholder:text-fg-muted focus:border-fg-faint focus:ring-2 focus:ring-fg/5 transition-colors"
            autoFocus
          />
          <button
            type="button"
            disabled={replyText.trim().length === 0}
            onClick={() => void onSubmit()}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-7 text-[11px] font-medium px-2.5 rounded-md transition-colors flex items-center",
              replyText.trim().length === 0
                ? "bg-sunken-2 text-fg-faint cursor-not-allowed"
                : "bg-fg text-white hover:bg-fg-2"
            )}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function resizeReplyTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "0px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

export function handleReplyTextareaChange(
  value: string,
  textarea: HTMLTextAreaElement,
  onChange: (value: string) => void
) {
  onChange(value);
  resizeReplyTextarea(textarea);
}
