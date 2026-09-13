"use client";

import type { Editor } from "@tiptap/react";
import type { NsfwCategory } from "@35mm/types";
import { cn } from "@/lib/utils/cn";
import { storedRichTextToPlainText } from "@/lib/utils/richContent";
import { FormattingToolbar } from "./FormattingToolbar";
import { RichTextEditor } from "./RichTextEditor";

export const LOG_MAX_CHARS = 2000;

interface LogNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  editor: Editor | null;
  onEditorReady: (editor: Editor | null) => void;
  showFormatBar: boolean;
  onBlur: (ev: FocusEvent) => void;
  onFocus: () => void;
  editable?: boolean;
  onNsfwHintChange?: (categories: NsfwCategory[]) => void;
}

export function LogNoteField(props: LogNoteFieldProps) {
  var plainText = storedRichTextToPlainText(props.value);
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
        onNsfwHintChange={props.onNsfwHintChange}
        placeholder={
          props.editable === false
            ? "Select a film to add a note or review."
            : "Add a review (optional). A few words are enough."
        }
        className={cn(
          "min-h-[112px] px-3.5 py-3 text-[16px] font-normal leading-relaxed",
          props.editable === false ? "cursor-not-allowed text-fg-muted" : "text-fg"
        )}
      />

      <div className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2">
        <span className="text-[12px] text-fg-muted">Review is optional</span>

        <span
          className={cn(
            "shrink-0 font-mono text-[11px] tabular-nums",
            overLimit ? "font-semibold text-film-red" : "text-fg-muted"
          )}
        >
          {plainText.length}/{LOG_MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
