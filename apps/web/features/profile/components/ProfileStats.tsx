"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";
import { ProfileConnectionsModal } from "./ProfileConnectionsModal";

function StatDivider() {
  return <div className="h-7 w-px shrink-0 bg-border" aria-hidden />;
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
          "hover:bg-hover active:bg-active",
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

function StatInline(props: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="font-semibold tabular-nums text-fg">{props.value}</span>
      <span className="font-normal text-fg-muted">{props.label}</span>
    </>
  );

  const className = cn(
    "inline-flex items-baseline gap-1 text-[14px] leading-none",
    props.onClick &&
      "rounded-sm border-none bg-transparent p-0 font-inherit transition-opacity active:opacity-70"
  );

  if (props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className={className}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}

export function ProfileStats(props: {
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  filmsLoggedCount: number;
  isOwnProfile: boolean;
  className?: string;
  variant?: "toolbar" | "inline";
}) {
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [connectionsKind, setConnectionsKind] = useState<"followers" | "following">("followers");
  const variant = props.variant ?? "toolbar";

  return (
    <>
      <div
        className={cn(
          variant === "inline"
            ? "flex flex-wrap items-center gap-x-4 gap-y-2"
            : "flex h-full min-w-0 flex-1 items-center overflow-x-auto scrollbar-hide",
          props.className
        )}
      >
        {variant === "inline" ? (
          <>
            <StatInline
              label="Following"
              value={formatCount(props.followingCount)}
              onClick={function () {
                setConnectionsKind("following");
                setConnectionsOpen(true);
              }}
            />
            <StatInline
              label="Followers"
              value={formatCount(props.followerCount)}
              onClick={function () {
                setConnectionsKind("followers");
                setConnectionsOpen(true);
              }}
            />
            <StatInline label="Films" value={formatCount(props.filmsLoggedCount)} />
          </>
        ) : (
          <>
            <StatColumn
              label="Following"
              value={formatCount(props.followingCount)}
              onClick={function () {
                setConnectionsKind("following");
                setConnectionsOpen(true);
              }}
            />
            <StatDivider />
            <StatColumn
              label="Followers"
              value={formatCount(props.followerCount)}
              onClick={function () {
                setConnectionsKind("followers");
                setConnectionsOpen(true);
              }}
            />
            <StatDivider />
            <StatColumn label="Films" value={formatCount(props.filmsLoggedCount)} />
          </>
        )}
      </div>

      <ProfileConnectionsModal
        open={connectionsOpen}
        onClose={function () {
          setConnectionsOpen(false);
        }}
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
