"use client";

import { Icon } from "@/components/Icon/Icon";
import { cn } from "@/lib/utils/cn";

interface ChatJumpToLatestFabProps {
  show: boolean;
  newMessageCount: number;
  onPress: () => void;
}

export function ChatJumpToLatestFab({
  show,
  newMessageCount,
  onPress,
}: ChatJumpToLatestFabProps) {
  if (!show) {
    return null;
  }

  const label =
    newMessageCount > 0
      ? "Jump to latest, " +
        String(newMessageCount) +
        (newMessageCount === 1 ? " new message" : " new messages")
      : "Jump to latest messages";

  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        "pointer-events-auto absolute z-20 flex h-11 min-w-[2.75rem] items-center justify-center gap-1 rounded-full border border-border bg-elevated/95 px-3 shadow-[0_4px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-transform hover:scale-[1.02] active:scale-[0.98]",
        "bottom-3 right-3 md:bottom-5 md:right-5"
      )}
      aria-label={label}
    >
      {newMessageCount > 0 ? (
        <span className="text-[12px] font-semibold text-[#007AFF] tabular-nums">
          {newMessageCount > 99 ? "99+" : String(newMessageCount)}
        </span>
      ) : null}
      <Icon name="chevron-down" className="w-5 h-5 text-fg shrink-0" strokeWidth={2} />
    </button>
  );
}
