"use client";

import type { Editor } from "@tiptap/react";
import { Avatar } from "@/components/Avatar";
import { CURRENT_USER } from "@/lib/constants/currentUser";
import { cn } from "@/lib/utils/cn";
import { hasVisibleRichText } from "@/lib/utils/richContent";
import { useState } from "react";
import { FormattingToolbar } from "../PostComposer/FormattingToolbar";
import { RichTextEditor } from "../PostComposer/RichTextEditor";

interface CommentCardReplyComposerProps {
  open: boolean;
  depth: number;
  username: string;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onSubmit: () => void;
}

export function CommentCardReplyComposer({
  open,
  depth,
  username,
  replyText,
  onReplyTextChange,
  onSubmit,
}: CommentCardReplyComposerProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  if (!open || depth >= 2) return null;

  return (
    <div className="mt-2.5 ml-0.5">
      <div className="flex items-start gap-2">
        <Avatar
          initial={CURRENT_USER.initial}
          src={CURRENT_USER.avatarUrl}
          className="mt-1 w-8 h-8"
        />
        <div className="relative flex-1 rounded-md border border-border bg-elevated transition-colors focus-within:border-fg-faint focus-within:ring-2 focus-within:ring-fg/5">
          <RichTextEditor
            value={replyText}
            onChange={(value) => onReplyTextChange(value)}
            onEditorReady={setEditor}
            placeholder={`Reply to ${username}...`}
            autoFocus
            className="min-h-[42px] py-2 pl-3 pr-16 text-[12.5px] leading-[1.45] text-fg"
          />
          <button
            type="button"
            disabled={!hasVisibleRichText(replyText)}
            onClick={() => void onSubmit()}
            className={cn(
              "absolute right-2 top-2 h-7 text-[11px] font-medium px-2.5 rounded-md transition-colors flex items-center",
              !hasVisibleRichText(replyText)
                ? "bg-sunken-2 text-fg-faint cursor-not-allowed"
                : "bg-fg text-white hover:bg-fg-2"
            )}
          >
            Reply
          </button>
          <div className="border-t border-border/60 px-2 py-1">
            <FormattingToolbar editor={editor} showDivider={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
