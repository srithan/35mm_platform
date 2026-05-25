"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { ProfileConnectionsModal } from "./ProfileConnectionsModal";

function StatDivider() {
  return <div className="h-7 w-px shrink-0 bg-border/80" aria-hidden />;
}

function StatColumn(props: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  if (props.onClick) {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className={cn(
          "flex min-w-[4.5rem] flex-col items-center justify-center gap-1 px-3 py-1",
          "rounded-md border-none bg-transparent font-inherit",
          "transition-colors duration-150",
          "hover:bg-fg-muted/10 active:bg-fg-muted/15",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-2"
        )}
      >
        <span className="font-mono text-[15px] font-semibold leading-none tabular-nums text-fg">
          {props.value}
        </span>
        <span className="text-[11px] font-medium leading-none tracking-[0.01em] text-fg-faint">
          {props.label}
        </span>
      </button>
    );
  }

  return (
    <div className="flex min-w-[4.5rem] flex-col items-center justify-center gap-1 px-3 py-1">
      <span className="font-mono text-[15px] font-semibold leading-none tabular-nums text-fg">
        {props.value}
      </span>
      <span className="text-[11px] font-medium leading-none tracking-[0.01em] text-fg-faint">
        {props.label}
      </span>
    </div>
  );
}

export function ProfileStats(props: {
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  filmsLoggedCount: number;
  isOwnProfile: boolean;
  className?: string;
}) {
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsKind, setConnectionsKind] = useState<"followers" | "following">("followers");

  return (
    <>
      <div
        className={cn(
          "flex h-full min-w-0 flex-1 items-center overflow-x-auto scrollbar-hide",
          props.className
        )}
      >
        <StatColumn
          label="Following"
          value={formatCount(props.followingCount)}
          onClick={() => {
            setConnectionsKind("following");
            setConnectionsOpen(true);
          }}
        />
        <StatDivider />
        <StatColumn
          label="Followers"
          value={formatCount(props.followerCount)}
          onClick={() => {
            setConnectionsKind("followers");
            setConnectionsOpen(true);
          }}
        />
        <StatDivider />
        <StatColumn label="Films" value={formatCount(props.filmsLoggedCount)} />
      </div>

      <ProfileConnectionsModal
        open={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
        username={props.username}
        kind={connectionsKind}
        isOwnProfile={props.isOwnProfile}
        displayName={props.displayName}
        followerCount={props.followerCount}
        followingCount={props.followingCount}
      />
    </>
  );
}
