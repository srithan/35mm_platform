"use client";

import { PenLine } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useNewChat } from "../context/NewChatContext";

interface NewChatComposeButtonProps {
  className?: string;
  size?: "sm" | "md";
}

export function NewChatComposeButton({
  className,
  size = "md",
}: NewChatComposeButtonProps) {
  var { openNewChat } = useNewChat();
  var dimension = size === "sm" ? "w-9 h-9" : "w-10 h-10";
  var iconSize = size === "sm" ? "w-[18px] h-[18px]" : "w-5 h-5";

  return (
    <button
      type="button"
      onClick={function () {
        openNewChat();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-[var(--chat-accent)] hover:bg-[var(--chat-accent-bg)] transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        dimension,
        className
      )}
      aria-label="New message"
      title="New message"
    >
      <PenLine className={iconSize} strokeWidth={2} aria-hidden />
    </button>
  );
}
