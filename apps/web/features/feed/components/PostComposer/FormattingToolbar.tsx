"use client";

import type { Editor } from "@tiptap/react";
import { Bold, EyeOff, Italic, Underline } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type FormatCommand = "bold" | "italic" | "underline" | "spoiler";

interface FormattingToolbarProps {
  editor: Editor | null;
  className?: string;
  showDivider?: boolean;
  composeChrome?: boolean;
}

export function FormattingToolbar({
  editor,
  className,
  showDivider = true,
  composeChrome = false,
}: FormattingToolbarProps) {
  function run(cmd: FormatCommand) {
    if (!editor) return;
    var chain = editor.chain().focus();
    if (cmd === "bold") chain.toggleBold().run();
    if (cmd === "italic") chain.toggleItalic().run();
    if (cmd === "underline") chain.toggleUnderline().run();
    if (cmd === "spoiler") chain.toggleMark("spoiler").run();
  }

  const btn = composeChrome
    ? "w-9 h-9 rounded-full flex items-center justify-center text-accent transition-colors hover:bg-accent/[0.12] active:scale-95"
    : "w-8 h-8 rounded-full flex items-center justify-center text-fg-muted transition-all hover:bg-hover hover:text-fg active:scale-95";

  function buttonClass(cmd: FormatCommand) {
    return cn(
      btn,
      editor?.isActive(cmd === "spoiler" ? "spoiler" : cmd) &&
        (composeChrome ? "bg-accent/15" : "bg-hover text-fg")
    );
  }

  return (
    <div className={cn("flex items-center gap-0.5 -ml-1", className)}>
      {showDivider && (
        <div className={cn("mx-1 h-4 w-px", composeChrome ? "bg-accent/25" : "bg-border")} />
      )}
      <button
        type="button"
        onClick={() => run("bold")}
        className={buttonClass("bold")}
        title="Bold"
        aria-pressed={editor?.isActive("bold") ?? false}
      >
        <Bold className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={() => run("italic")}
        className={buttonClass("italic")}
        title="Italic"
        aria-pressed={editor?.isActive("italic") ?? false}
      >
        <Italic className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={() => run("underline")}
        className={buttonClass("underline")}
        title="Underline"
        aria-pressed={editor?.isActive("underline") ?? false}
      >
        <Underline className="h-4 w-4" strokeWidth={2.4} />
      </button>
      <button
        type="button"
        onClick={() => run("spoiler")}
        className={buttonClass("spoiler")}
        title="Spoiler"
        aria-label="Toggle spoiler"
        aria-pressed={editor?.isActive("spoiler") ?? false}
      >
        <EyeOff className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}
