"use client";

import { Avatar } from "@/components/Avatar";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";
import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PostCardAuthorProps, PostVariant } from "./types";

interface PostCardHeaderProps extends PostCardAuthorProps {
  variant: PostVariant;
  timestamp: string;
  menu: React.ReactNode;
  children: React.ReactNode;
}

export function PostCardHeader({
  variant,
  timestamp,
  menu,
  children,
  username,
  displayName,
  avatarUrl,
  avatarInitial,
  avatarBg,
  avatarColor,
  handle,
  role,
  roleContext,
  filmsLoggedCount,
}: PostCardHeaderProps) {
  const hasRole = role != null && role.trim() !== "";

  return (
    <>
      <UsernameLink
        username={username}
        displayName={displayName}
        avatarUrl={avatarUrl}
        initial={avatarInitial}
        avatarBg={avatarBg}
        avatarColor={avatarColor}
        role={role ?? undefined}
        roleContext={roleContext}
        className="mr-2 flex-shrink-0 self-start no-underline"
      >
        <Avatar initial={avatarInitial} src={avatarUrl} className="w-10 h-10" />
      </UsernameLink>
      <div className="flex-1 min-w-0">
        <div className="relative pr-8">
          <div className="flex items-baseline gap-2 flex-wrap min-w-0">
            <UsernameLink
              username={username}
              displayName={displayName}
              avatarUrl={avatarUrl}
              initial={avatarInitial}
              avatarBg={avatarBg}
              avatarColor={avatarColor}
              role={role ?? undefined}
              roleContext={roleContext}
              className="group text-[13.5px] font-bold text-fg no-underline"
            >
              <span className="group-hover:underline underline-offset-2">
                {displayName ?? username}
              </span>{" "}
              <span className="font-normal text-fg-muted no-underline">{handle}</span>
            </UsernameLink>
            <span className="text-xs text-fg-muted ">· {timestamp}</span>
            {variant === "film-log" && (
              <span className="text-[11px] text-fg-muted ml-0.5">logged</span>
            )}
            {variant === "discussion" && (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 border-l border-border-strong pl-1.5",
                  "text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                )}
              >
                <MessagesSquare
                  className="h-3 w-3 shrink-0 text-fg-faint"
                  strokeWidth={1.8}
                  aria-hidden
                />
                Discussion
              </span>
            )}
          </div>
          <div className="absolute right-0 top-0">{menu}</div>
        </div>

        {hasRole ? (
          <UserRoleHeadline
            role={role.trim()}
            roleContext={roleContext}
            filmsLoggedCount={filmsLoggedCount}
            textClassName="text-[11px]"
          />
        ) : null}

        <div className={cn(hasRole ? "pt-2" : "pt-0")}>{children}</div>
      </div>
    </>
  );
}
