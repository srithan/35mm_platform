"use client";

import { useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/lib/utils/cn";
import { postComposerWritePrompt } from "@/features/feed/components/PostComposer/writePrompt";

export interface PostComposerTriggerUser {
  name: string;
  avatarUrl: string | null;
  initial: string;
}

interface PostComposerTriggerProps {
  onOpen: () => void;
  user: PostComposerTriggerUser;
  suppressDefaultAvatar?: boolean;
}

const TRIGGER_TOOLS = [
  {
    id: "media",
    label: "Photos/Video",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="1.5" y="2.5" width="13" height="11" rx="1.6" />
        <circle cx="5.2" cy="6.2" r="1.2" />
        <path d="M3.2 11.2l3-3 2.1 2 2.3-2.2 2.2 3.2" />
      </svg>
    ),
  },
  {
    id: "gif",
    label: "GIF",
  },
  {
    id: "emoji",
    label: "Emoji",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="8" cy="8" r="6.2" />
        <circle cx="5.8" cy="6.6" r="0.65" fill="currentColor" stroke="none" />
        <circle cx="10.2" cy="6.6" r="0.65" fill="currentColor" stroke="none" />
        <path d="M5.2 9.5c.6.9 1.6 1.4 2.8 1.4s2.2-.5 2.8-1.4" />
      </svg>
    ),
  },
  // { id: "h1", label: "H1" },
  // { id: "h2", label: "H2" },
  // { id: "bold", label: "B" },
  // { id: "italic", label: "I" },
] as const;

function TriggerTool({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--composer-control-radius)] border border-[var(--composer-border)] px-2 py-1",
        "bg-[var(--composer-chip-bg)] text-[10.5px] font-medium text-fg-muted"
      )}
      aria-hidden
    >
      {icon}
      <span>{label}</span>
    </span>
  );
}

export function PostComposerTrigger({
  onOpen,
  user,
  suppressDefaultAvatar = false,
}: PostComposerTriggerProps) {
  const prompt = useMemo(() => {
    return postComposerWritePrompt(user.name);
  }, [user.name]);

  return (
    <div className="PostComposerTrigger rounded-[var(--composer-radius)] pb-4">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "w-full cursor-pointer border-0 border-b border-[var(--composer-border)] bg-[var(--composer-bg)] text-left",
          "rounded-[var(--composer-radius)] pt-2 transition-[border-color,box-shadow] duration-150 ease-out",
          "hover:border-[var(--border-strong)]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        )}
        aria-label="Create new post"
      >
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
          <Avatar
            initial={user.initial}
            src={user.avatarUrl}
            allowDefaultFallback={!suppressDefaultAvatar}
            loading="eager"
            className="w-9 h-9"
          />

          <div className="flex h-[46px] min-w-0 flex-1 items-center rounded-[var(--composer-control-radius)] bg-[var(--composer-field-bg)] px-5">
            <span className="block truncate text-left text-[15px] font-normal text-fg-muted select-none">
              {prompt}
            </span>
          </div>

          <span
            className="pointer-events-none flex-shrink-0 select-none rounded-[var(--composer-control-radius)] bg-[var(--composer-primary)] px-4 py-2 text-[12.5px] font-semibold tracking-wide text-[var(--composer-primary-fg)]"
            aria-hidden
          >
            Post
          </span>
        </div>

        <div
          className="px-5 pt-1 pb-3.5 ml-12 flex items-center gap-1.5 flex-wrap"
          aria-hidden
        >
          {TRIGGER_TOOLS.map((tool) => (
            <TriggerTool
              key={tool.id}
              label={tool.label}
              icon={"icon" in tool ? tool.icon : undefined}
            />
          ))}
        </div>
      </button>
    </div>
  );
}
