"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";
import { Icon } from "@/components/Icon/Icon";
import { PostComposer } from "../PostComposer";
import { postComposerWritePrompt } from "../PostComposer/writePrompt";
import type { PostComposerTriggerUser } from "../PostComposerTrigger";

interface InlinePostComposerProps {
  user: PostComposerTriggerUser;
  suppressDefaultAvatar?: boolean;
}

const QUICK_MODES = [
  { id: "write", label: "Write", icon: "align-left" },
  { id: "log", label: "Log", icon: "clapperboard" },
  { id: "discussion", label: "Discuss", icon: "chat" },
] as const;

/**
 * Trigger that is also a composer. Unlike `PostComposerTrigger` (which opens the
 * modal), clicking this expands the full `PostComposer` inline, in place.
 * Distinct "rehashed" visual treatment from the default trigger.
 */
export function InlinePostComposer({
  user,
  suppressDefaultAvatar = false,
}: InlinePostComposerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);
  const isDirtyRef = useRef(false);

  const prompt = useMemo(() => postComposerWritePrompt(user.name), [user.name]);

  useEffect(() => {
    if (!isExpanded) return;

    function handlePointerDown(e: PointerEvent) {
      if (isDirtyRef.current) return;
      var target = e.target;
      if (target instanceof Node && expandedRef.current?.contains(target)) return;
      // Ignore clicks inside portaled composer popovers (emoji, GIF, etc.).
      if (
        target instanceof Element &&
        target.closest(
          "[data-emoji-panel], [data-composer-popover], .EmojiPickerReact"
        )
      ) {
        return;
      }
      setIsExpanded(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isExpanded]);

  if (isExpanded) {
    return (
      <div
        ref={expandedRef}
        className={cn(
          "InlinePostComposer pb-4",
          // Keep a clean rounded border, but drop the composer's shadow/focus ring
          // so it embeds nicely in the feed.
          "[&>div]:!rounded-[var(--composer-radius)] [&>div]:!shadow-none [&>div]:!ring-0"
        )}
      >
        <PostComposer
          variant="inline"
          onDirtyChange={(dirty) => {
            isDirtyRef.current = dirty;
          }}
          onSubmit={() => setIsExpanded(false)}
          onClose={() => setIsExpanded(false)}
        />
      </div>
    );
  }

  return (
    <div className="InlinePostComposer pb-4">
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-[var(--composer-border)] bg-[var(--composer-bg)]",
          "shadow-sm transition-shadow duration-150 hover:shadow-md"
        )}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-accent"
          aria-hidden
        />

        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          )}
          aria-label="Compose a post inline"
        >
          <Avatar
            initial={user.initial}
            src={user.avatarUrl}
            allowDefaultFallback={!suppressDefaultAvatar}
            loading="eager"
            className="h-9 w-9 flex-shrink-0"
          />

          <span className="flex min-w-0 flex-1 items-center rounded-full bg-[var(--composer-field-bg)] px-4 py-2.5">
            <span className="block truncate text-[14.5px] font-normal text-fg-muted">
              {prompt}
            </span>
          </span>

          <span
            className="pointer-events-none flex-shrink-0 select-none rounded-[var(--composer-control-radius)] bg-[var(--composer-primary)] px-4 py-2 text-[12.5px] font-semibold tracking-wide text-[var(--composer-primary-fg)]"
            aria-hidden
          >
            Post
          </span>
        </button>

        <div className="flex items-center gap-1.5 border-t border-[var(--composer-border)] px-4 py-2">
          {QUICK_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIsExpanded(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1",
                "text-[11.5px] font-medium text-fg-muted transition-colors",
                "hover:border-[var(--composer-border)] hover:bg-[var(--composer-chip-bg)] hover:text-fg"
              )}
            >
              <Icon name={m.icon} className="h-3.5 w-3.5" strokeWidth={1.7} />
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
