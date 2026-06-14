"use client";

import { Avatar } from "@/components/Avatar";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { UserRoleHeadline } from "@/lib/utils/userRoleHeadline";
import type { Comment } from "./types";

interface CommentCardHeaderProps {
  comment: Comment;
  menu: React.ReactNode;
  children: React.ReactNode;
}

export function CommentCardHeader({ comment, menu, children }: CommentCardHeaderProps) {
  return (
    <>
      <UsernameLink
        username={comment.username}
        displayName={comment.displayName}
        avatarUrl={comment.avatarUrl}
        initial={comment.avatarInitial}
        avatarBg={comment.avatarBg}
        avatarColor={comment.avatarColor}
        role={comment.role ?? undefined}
        roleContext={comment.roleContext}
        className="mr-2 flex-shrink-0 self-start no-underline"
      >
        <Avatar
          initial={comment.avatarInitial}
          src={comment.avatarUrl}
          className="h-10 w-10"
        />
      </UsernameLink>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <UsernameLink
              username={comment.username}
              displayName={comment.displayName}
              avatarUrl={comment.avatarUrl}
              initial={comment.avatarInitial}
              avatarBg={comment.avatarBg}
              avatarColor={comment.avatarColor}
              role={comment.role ?? undefined}
              roleContext={comment.roleContext}
              className="group text-[13.5px] font-bold text-fg no-underline"
            >
              <span className="group-hover:underline underline-offset-2">
                {comment.displayName ?? comment.username}
              </span>{" "}
              <span className="font-normal text-fg-muted">@{comment.username}</span>
            </UsernameLink>
            <span className="text-xs text-fg-muted ">· {comment.timestamp}</span>
          </div>
          {menu}
        </div>

        {comment.role != null && comment.role.trim() !== "" ? (
          <UserRoleHeadline
            role={comment.role.trim()}
            roleContext={comment.roleContext}
            filmsLoggedCount={comment.filmsLoggedCount}
            textClassName="text-[10.5px]"
          />
        ) : null}

        {children}
      </div>
    </>
  );
}
