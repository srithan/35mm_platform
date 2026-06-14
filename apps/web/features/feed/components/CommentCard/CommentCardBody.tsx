"use client";

import { cn } from "@/lib/utils/cn";
import { RichPostInline } from "@/lib/utils/richPostText";
import { VideoUrlPreview } from "../VideoUrlPreview";
import type { RefObject } from "react";
import type { VideoPreview } from "../../utils/videoPreviews";

interface CommentCardBodyProps {
  isEditing: boolean;
  editDraft: string;
  isSaving: boolean;
  cleanedText: string;
  previews: VideoPreview[];
  expanded: boolean;
  isOverflowing: boolean;
  truncatedText: string | null;
  bodyRef: RefObject<HTMLParagraphElement>;
  measureRef: RefObject<HTMLDivElement>;
  onEditDraftChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onExpand: () => void;
  onCollapse: () => void;
}

export function CommentCardBody({
  isEditing,
  editDraft,
  isSaving,
  cleanedText,
  previews,
  expanded,
  isOverflowing,
  truncatedText,
  bodyRef,
  measureRef,
  onEditDraftChange,
  onSaveEdit,
  onCancelEdit,
  onExpand,
  onCollapse,
}: CommentCardBodyProps) {
  return (
    <div className="mt-1">
      {isEditing ? (
        <div className="mt-1">
          <textarea
            value={editDraft}
            onChange={(e) => onEditDraftChange(e.target.value)}
            rows={3}
            className="w-full resize-y min-h-[84px] rounded-md border border-border bg-elevated px-3 py-2 text-[15px] leading-[1.55] text-fg outline-none focus:border-fg-faint focus:ring-2 focus:ring-fg/5"
            autoFocus
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={editDraft.trim().length === 0 || isSaving}
              onClick={() => void onSaveEdit()}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors",
                editDraft.trim().length === 0 || isSaving
                  ? "cursor-not-allowed bg-sunken-2 text-fg-faint"
                  : "bg-fg text-bg hover:opacity-90"
              )}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-full px-3.5 py-1.5 text-[12px] font-medium text-fg-muted transition-colors hover:bg-hover hover:text-fg"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {!isEditing && cleanedText.length > 0 && (
        <div className="relative">
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute left-0 top-0 -z-10 whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-fg"
          />
          <p
            ref={bodyRef}
            className="text-[15px] leading-[1.65] text-fg whitespace-pre-wrap break-words"
          >
            <RichPostInline
              text={expanded ? cleanedText : truncatedText ?? cleanedText}
              segmentKeyPrefix="comment-body"
            />
            {!expanded && truncatedText != null && isOverflowing ? (
              <>
                {" "}
                <button
                  type="button"
                  className="inline border-none bg-transparent p-0 font-[inherit] font-medium text-fg-muted underline-offset-2 transition-colors hover:text-fg hover:underline"
                  onClick={onExpand}
                >
                  more
                </button>
              </>
            ) : null}
          </p>
        </div>
      )}

      {!isEditing && expanded && isOverflowing && (
        <button
          type="button"
          className="text-text-tertiary hover:text-fg text-[13px] bg-transparent border-none p-0 cursor-pointer mt-1 block font-[inherit]"
          onClick={onCollapse}
        >
          less
        </button>
      )}

      {!isEditing &&
        previews.map((preview) => (
          <VideoUrlPreview key={`${preview.provider}:${preview.id}`} preview={preview} />
        ))}
    </div>
  );
}
