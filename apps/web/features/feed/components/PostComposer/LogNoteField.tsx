"use client";

import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils/cn";
import { storedRichTextToPlainText } from "@/lib/utils/richContent";
import { FormattingToolbar } from "./FormattingToolbar";
import { RichTextEditor } from "./RichTextEditor";

export const LOG_MAX_CHARS = 2000;
export const REVIEW_THRESHOLD = 200;

interface LogNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  editor: Editor | null;
  onEditorReady: (editor: Editor | null) => void;
  isReview: boolean;
  showFormatBar: boolean;
  onBlur: (ev: FocusEvent) => void;
  onFocus: () => void;
  editable?: boolean;
}

export function LogNoteField(props: LogNoteFieldProps) {
  var plainText = storedRichTextToPlainText(props.value);
  var charsToReview = Math.max(0, REVIEW_THRESHOLD - plainText.length);
  var reviewProgress = Math.min(100, (plainText.length / REVIEW_THRESHOLD) * 100);
  var overLimit = plainText.length > LOG_MAX_CHARS;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-sunken transition-[border-color,background-color,box-shadow] duration-150",
        props.editable !== false
          ? "focus-within:border-fg-muted/50 focus-within:bg-[var(--composer-bg)] focus-within:shadow-sm"
          : "border-border bg-sunken/70"
      )}
    >
      {props.showFormatBar && props.editable !== false ? (
        <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
          <FormattingToolbar editor={props.editor} showDivider={false} />
        </div>
      ) : null}

      <RichTextEditor
        key={props.editable === false ? "locked" : "editable"}
        value={props.value}
        onChange={(value) => props.onChange(value)}
        onEditorReady={props.onEditorReady}
        onBlur={props.onBlur}
        onFocus={props.onFocus}
        editable={props.editable !== false}
        placeholder={
          props.editable === false
            ? "Select a film to add a note or review."
            : props.isReview
            ? "What stood out? Performances, craft, themes - spoil carefully."
            : "Optional note. 200+ characters turns this into a review."
        }
        className={cn(
          "min-h-[112px] px-3.5 py-3 text-[16px] font-normal leading-relaxed",
          props.editable === false ? "cursor-not-allowed text-fg-muted" : "text-fg"
        )}
      />

      <div className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2">
        {!props.isReview && plainText.length > 0 ? (
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-film-gold transition-[width] duration-200"
                style={{ width: reviewProgress + "%" }}
              />
            </div>
            <span className="shrink-0 font-mono text-[10px] tabular-nums text-fg-faint">
              {charsToReview} to review
            </span>
          </div>
        ) : (
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.12em]",
              props.isReview ? "text-accent" : "text-fg-faint"
            )}
          >
            {props.isReview ? "Review" : "Quick log"}
          </span>
        )}

        <span
          className={cn(
            "shrink-0 font-mono text-[11px] tabular-nums",
            overLimit ? "font-semibold text-film-red" : "text-fg-faint"
          )}
        >
          {plainText.length}/{LOG_MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
