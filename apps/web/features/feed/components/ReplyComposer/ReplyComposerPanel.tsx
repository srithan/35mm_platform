"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";
import { hasVisibleRichText } from "@/lib/utils/richContent";
import { initialForName, useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { FormattingToolbar } from "../PostComposer/FormattingToolbar";
import { RichTextEditor } from "../PostComposer/RichTextEditor";

export interface ReplyComposerPanelProps {
  replyToHandle: string;
  replyToName?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  autoFocus?: boolean;
  className?: string;
  variant?: "thread" | "nested";
}

export function ReplyComposerPanel({
  replyToHandle,
  replyToName,
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "Write your reply…",
  submitLabel = "Reply",
  isSubmitting = false,
  error = null,
  autoFocus = true,
  className,
  variant = "thread",
}: ReplyComposerPanelProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const avatarInitial = initialForName(currentUser?.displayName ?? currentUser?.username);
  const canSubmit = hasVisibleRichText(value) && !isSubmitting;
  const isNested = variant === "nested";
  const avatarSize = isNested ? "h-8 w-8" : "h-10 w-10";

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-3">
        <div className="flex w-10 shrink-0 flex-col items-center">
          <Avatar
            initial={avatarInitial}
            src={currentUser?.avatarUrl}
            className={avatarSize}
          />
          <span
            className="mt-2 w-px flex-1 min-h-5 rounded-full bg-border-strong/70"
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="inline-flex min-w-0 items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-social-accent text-white shadow-sm">
                <Icon name="reply" className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <p className="min-w-0 text-[13px] leading-snug text-fg-muted">
                <span className="font-medium text-fg">Replying to</span>{" "}
                <span className="font-semibold text-social-accent">@{replyToHandle}</span>
                {replyToName && replyToName.trim().length > 0 ? (
                  <span className="text-fg-faint"> · {replyToName.trim()}</span>
                ) : null}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden rounded-xl border border-border bg-elevated shadow-sm transition-[border-color,box-shadow] duration-150",
              "focus-within:border-fg-muted/40 focus-within:shadow-md"
            )}
          >
            <RichTextEditor
              value={value}
              onChange={(next) => onChange(next)}
              onEditorReady={setEditor}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                "px-3.5 py-3 text-[15px] leading-[1.55] text-fg",
                isNested ? "min-h-[72px]" : "min-h-[96px]"
              )}
            />

            <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-sunken/40 px-2.5 py-2">
              <FormattingToolbar editor={editor} showDivider={false} />
              <div className="flex shrink-0 items-center gap-1.5">
                {onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-full px-3 py-1.5 text-[13px] font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => void onSubmit()}
                  className={cn(
                    "inline-flex h-8 items-center justify-center rounded-full px-4 text-[13px] font-bold transition-all duration-150 active:scale-[0.98]",
                    canSubmit
                      ? "bg-fg text-bg hover:opacity-90"
                      : "cursor-not-allowed bg-sunken-2 text-fg-faint"
                  )}
                >
                  {isSubmitting ? "Posting…" : submitLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? <p className="ml-[52px] mt-2 text-[12px] text-film-red">{error}</p> : null}
    </div>
  );
}

export function ReplyComposerTrigger(props: {
  onClick: () => void;
  avatarInitial: string;
  avatarUrl?: string | null;
  placeholder?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-label={props.placeholder ?? "Post your reply…"}
      className={cn(
        "group mx-4 my-3 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-sunken/60 px-4 py-3.5 text-left transition-all duration-150",
        "hover:border-fg-muted/35 hover:bg-hover/50 active:scale-[0.995]",
        props.className
      )}
    >
      <Avatar
        initial={props.avatarInitial}
        src={props.avatarUrl}
        className="h-10 w-10 shrink-0"
      />
      <span className="flex-1 text-[15px] font-medium text-fg-muted transition-colors group-hover:text-fg">
        {props.placeholder ?? "Post your reply…"}
      </span>
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hover text-fg-muted transition-colors group-hover:bg-fg group-hover:text-bg">
        <Icon name="reply" className="h-4 w-4" strokeWidth={2.2} />
      </span>
    </button>
  );
}
