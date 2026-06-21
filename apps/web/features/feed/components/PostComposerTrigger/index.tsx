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
        "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1",
        "text-[10.5px] font-medium text-fg-muted bg-elevated"
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
    <div className="PostComposerTrigger pb-4 rounded-lg">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "w-full bg-elevated border-0 border-b border-border text-left cursor-pointer",
          "transition-[border-color] duration-150 ease-out rounded-lg pt-2",
          "hover:border-border",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/10"
        )}
        aria-label="Create new post"
      >
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
          <Avatar
            initial={user.initial}
            src={user.avatarUrl}
            allowDefaultFallback={!suppressDefaultAvatar}
            className="w-9 h-9"
          />

          <div className="flex-1 min-w-0 h-[46px] rounded-full bg-sunken px-5 flex items-center">
            <span className="block truncate text-left text-[15px] font-normal text-fg-muted select-none">
              {prompt}
            </span>
          </div>

          <span
            className="flex-shrink-0 bg-fg text-bg text-[12.5px] font-semibold px-4 py-2 rounded-lg pointer-events-none select-none tracking-wide"
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
