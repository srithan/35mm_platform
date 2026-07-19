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

function PostVariantLabel({
  variant,
  mobile = false,
}: {
  variant: PostVariant;
  mobile?: boolean;
}) {
  if (variant === "film-log") {
    return (
      <span
        data-post-variant-label="log"
        className={cn(
          "text-[11px] text-fg-muted",
          mobile ? "block sm:hidden" : "ml-0.5 hidden sm:inline"
        )}
      >
        logged
      </span>
    );
  }

  if (variant !== "discussion") return null;

  return (
    <span
      data-post-variant-label="discussion"
      className={cn(
        "shrink-0 items-center gap-1 border-l border-border-strong pl-1.5",
        "text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-muted",
        mobile ? "inline-flex sm:hidden" : "hidden sm:inline-flex"
      )}
    >
      <MessagesSquare
        className="h-3 w-3 shrink-0 text-fg-faint"
        strokeWidth={1.8}
        aria-hidden
      />
      Discussion
    </span>
  );
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
  const hasVariantLabel = variant === "film-log" || variant === "discussion";

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
            <PostVariantLabel variant={variant} />
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

        {hasVariantLabel ? (
          <div className={cn("sm:hidden", hasRole ? "mt-1" : "mt-1.5")}>
            <PostVariantLabel variant={variant} mobile />
          </div>
        ) : null}

        <div
          className={cn(
            hasRole ? "pt-2" : "pt-0",
            hasVariantLabel && hasRole && "pt-0 sm:pt-2"
          )}
        >
          {children}
        </div>
      </div>
    </>
  );
}
