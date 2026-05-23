"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils/cn";

type FormatCommand = "bold" | "italic" | "spoiler";

interface FormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  showDivider?: boolean;
  /** Accent/outline styling for mobile native-style compose chrome. */
  composeChrome?: boolean;
}

function wrapWithMarker(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string
): string {
  const beforeText = text.slice(0, start);
  const selected = text.slice(start, end);
  const afterText = text.slice(end);
  return `${beforeText}${before}${selected}${after}${afterText}`;
}

export function FormattingToolbar({
  textareaRef,
  value,
  onChange,
  className,
  showDivider = true,
  composeChrome = false,
}: FormattingToolbarProps) {
  const applyFormat = useCallback(
    (cmd: FormatCommand) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) return;

      let before: string;
      let after: string;
      switch (cmd) {
        case "bold":
          before = "**";
          after = "**";
          break;
        case "italic":
          before = "*";
          after = "*";
          break;
        case "spoiler":
          before = "||";
          after = "||";
          break;
        default:
          return;
      }

      const next = wrapWithMarker(value, start, end, before, after);
      onChange(next);
      const newCursor = end + before.length + after.length;
      setTimeout(() => {
        textarea.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [textareaRef, value, onChange]
  );

  const btn = composeChrome
    ? "w-9 h-9 rounded-full flex items-center justify-center text-accent transition-colors hover:bg-accent/[0.12] active:scale-95"
    : "w-8 h-8 rounded-full flex items-center justify-center text-fg-muted transition-all hover:bg-hover hover:text-fg active:scale-95";
  const iconClass = composeChrome ? "text-[15px]" : "text-xs";

  return (
    <div className={cn("flex items-center gap-0.5 -ml-1", className)}>
      {showDivider && (
        <div
          className={cn(
            "mx-1 h-4 w-px",
            composeChrome ? "bg-accent/25" : "bg-border"
          )}
        />
      )}
      <button
        type="button"
        onClick={() => applyFormat("bold")}
        className={cn(btn, iconClass, "font-bold")}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => applyFormat("italic")}
        className={cn(btn, iconClass, "italic font-sans")}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => applyFormat("spoiler")}
        className={btn}
        title="Spoiler"
        aria-label="Wrap selection in spoiler"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={composeChrome ? "text-accent" : "text-fg-muted"}
        >
          <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
          <circle cx="8" cy="8" r="2" />
          <path d="M3 3l10 10" strokeWidth="1.8" />
        </svg>
      </button>
    </div>
  );
}
