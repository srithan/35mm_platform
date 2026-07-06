"use client";

import type { Editor } from "@tiptap/react";
import { Bold, EyeOff, Italic, Strikethrough, Underline } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FormatCommand = "bold" | "italic" | "underline" | "strike" | "spoiler";

const formatButtons: Array<{
  cmd: FormatCommand;
  title: string;
  ariaLabel?: string;
  Icon: typeof Bold;
  strokeWidth: number;
}> = [
  { cmd: "bold", title: "Bold", Icon: Bold, strokeWidth: 2.4 },
  { cmd: "italic", title: "Italic", Icon: Italic, strokeWidth: 2.4 },
  { cmd: "underline", title: "Underline", Icon: Underline, strokeWidth: 2.4 },
  { cmd: "strike", title: "Strikethrough", Icon: Strikethrough, strokeWidth: 2.4 },
  { cmd: "spoiler", title: "Spoiler", ariaLabel: "Toggle spoiler", Icon: EyeOff, strokeWidth: 2.2 },
];

interface FormattingToolbarProps {
  editor: Editor | null;
  className?: string;
  showDivider?: boolean;
  composeChrome?: boolean;
}

function runFormatCommand(editor: Editor | null, cmd: FormatCommand) {
  if (!editor) return;
  var chain = editor.chain().focus();
  if (cmd === "bold") chain.toggleBold().run();
  if (cmd === "italic") chain.toggleItalic().run();
  if (cmd === "underline") chain.toggleUnderline().run();
  if (cmd === "strike") chain.toggleStrike().run();
  if (cmd === "spoiler") chain.toggleMark("spoiler").run();
}

function isFormatActive(editor: Editor | null, cmd: FormatCommand) {
  return editor?.isActive(cmd === "spoiler" ? "spoiler" : cmd) ?? false;
}

export function FormattingToolbar({
  editor,
  className,
  showDivider = true,
  composeChrome = false,
}: FormattingToolbarProps) {
  const btn = composeChrome
    ? "w-9 h-9 rounded-full flex items-center justify-center text-accent transition-colors hover:bg-accent/[0.12] active:scale-95"
    : "w-8 h-8 rounded-full flex items-center justify-center text-fg-muted transition-all hover:bg-hover hover:text-fg active:scale-95";

  function buttonClass(cmd: FormatCommand) {
    return cn(
      btn,
      isFormatActive(editor, cmd) && (composeChrome ? "bg-accent/15" : "bg-hover text-fg")
    );
  }

  return (
    <div className={cn("flex items-center gap-0.5 -ml-1", className)}>
      {showDivider && (
        <div className={cn("mx-1 h-4 w-px", composeChrome ? "bg-accent/25" : "bg-border")} />
      )}
      {formatButtons.map(function ({ cmd, title, ariaLabel, Icon, strokeWidth }) {
        return (
          <button
            key={cmd}
            type="button"
            onClick={() => runFormatCommand(editor, cmd)}
            className={buttonClass(cmd)}
            title={title}
            aria-label={ariaLabel}
            aria-pressed={isFormatActive(editor, cmd)}
          >
            <Icon className="h-4 w-4" strokeWidth={strokeWidth} />
          </button>
        );
      })}
    </div>
  );
}

export function FloatingFormattingToolbar({ editor }: { editor: Editor | null }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-[var(--composer-border)] bg-[var(--composer-bg)] p-1 shadow-xl">
      {formatButtons.map(function ({ cmd, title, ariaLabel, Icon, strokeWidth }) {
        return (
          <button
            key={cmd}
            type="button"
            onClick={() => runFormatCommand(editor, cmd)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-hover hover:text-fg",
              isFormatActive(editor, cmd) && "bg-accent/10 text-accent"
            )}
            title={title}
            aria-label={ariaLabel}
            aria-pressed={isFormatActive(editor, cmd)}
          >
            <Icon className="h-4 w-4" strokeWidth={strokeWidth} />
          </button>
        );
      })}
    </div>
  );
}
