"use client";

import { useState } from "react";
import { UsernameLink } from "@/components/UsernameLink/UsernameLink";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils/cn";

interface UserCardProps {
  username: string;
  handle: string;
  role?: string;
  initial?: string;
  avatarBg?: string;
  avatarColor?: string;
  showFollowButton?: boolean;
  isFollowing?: boolean;
}

export function UserCard({
  username,
  role,
  initial,
  avatarBg,
  avatarColor,
  showFollowButton = true,
  isFollowing: initialFollowing = false,
}: UserCardProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);

  const avatarStyle = avatarBg
    ? { background: avatarBg, color: avatarColor }
    : undefined;

  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-border last:border-b-0">
      <div
        className={cn(
          "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-xs",
          !avatarBg && "bg-border text-fg-light"
        )}
        style={avatarStyle}
      >
        {initial ?? username.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <UsernameLink
          username={username}
          role={role}
          initial={initial}
          avatarBg={avatarBg}
          avatarColor={avatarColor}
          className="text-[13px] font-bold leading-tight block no-underline text-fg hover:underline cursor-pointer"
        >
          {username}
        </UsernameLink>
        {role && (
          <div className="text-[11px] text-fg-muted ">{role}</div>
        )}
      </div>
      {showFollowButton && (
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          size="sm"
          onClick={() => setIsFollowing(!isFollowing)}
        >
          {isFollowing ? "Following" : "Follow"}
        </Button>
      )}
    </div>
  );
}
