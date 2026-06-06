"use client";

import { cn } from "@/lib/utils/cn";
import { FormattingToolbar } from "./FormattingToolbar";

export const LOG_MAX_CHARS = 2000;
export const REVIEW_THRESHOLD = 200;

interface LogNoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isReview: boolean;
  showFormatBar: boolean;
  onBlur: (ev: React.FocusEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
}

export function LogNoteField(props: LogNoteFieldProps) {
  var charsToReview = Math.max(0, REVIEW_THRESHOLD - props.value.length);
  var reviewProgress = Math.min(100, (props.value.length / REVIEW_THRESHOLD) * 100);
  var overLimit = props.value.length > LOG_MAX_CHARS;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-sunken transition-[border-color,background-color,box-shadow] duration-150 focus-within:border-fg-muted/50 focus-within:bg-elevated focus-within:shadow-sm">
      {props.showFormatBar ? (
        <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
          <FormattingToolbar
            textareaRef={props.textareaRef}
            value={props.value}
            onChange={props.onChange}
            showDivider={false}
          />
        </div>
      ) : null}

      <textarea
        ref={props.textareaRef}
        value={props.value}
        onChange={function (e) {
          props.onChange(e.target.value);
        }}
        onBlur={props.onBlur}
        onFocus={props.onFocus}
        placeholder={
          props.isReview
            ? "What stood out? Performances, craft, themes — spoil carefully."
            : "Optional note. 200+ characters turns this into a review."
        }
        className="w-full min-h-[112px] resize-none border-none bg-transparent px-3.5 py-3 text-[16px] font-normal leading-relaxed text-fg outline-none placeholder:text-fg-muted"
        style={{ caretColor: "var(--accent)" }}
      />

      <div className="flex items-center justify-between gap-3 border-t border-border/50 px-3.5 py-2">
        {!props.isReview && props.value.length > 0 ? (
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
          {props.value.length}/{LOG_MAX_CHARS}
        </span>
      </div>
    </div>
  );
}
