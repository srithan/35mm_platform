"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChatPresenceState } from "@35mm/types";
import type { ChatParticipant } from "../types";
import { useChatPresence } from "../hooks/useChatQueries";
import { useChatRealtime } from "../realtime/state";

export type ChatPresenceAvailability = "online" | "away" | "offline";

export interface ChatPresenceSummary {
  availability: ChatPresenceAvailability;
  label: string;
}

const AWAY_WINDOW_MS = 1000 * 60 * 60 * 24 * 28;

function formatActiveAgo(lastSeenAt: string, now: number): string {
  const time = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(time)) {
    return "Offline";
  }
  const diffMs = Math.max(0, now - time);
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) {
    return "Active " + mins + (mins === 1 ? " min" : " mins") + " ago";
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return "Active " + hours + (hours === 1 ? " hour" : " hours") + " ago";
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return "Active " + days + (days === 1 ? " day" : " days") + " ago";
  }
  const weeks = Math.floor(days / 7);
  return "Active " + weeks + (weeks === 1 ? " week" : " weeks") + " ago";
}

export function getChatPresenceTargetIds(
  members: ChatParticipant[] | undefined,
  currentUserId: string | null
): string[] {
  return Array.from(
    new Set(
      (members ?? [])
        .map(function (member) {
          return member.userId;
        })
        .filter(function (userId) {
          return userId && userId !== currentUserId;
        })
    )
  ).slice(0, 50);
}

export function summarizeChatPresence(
  targetIds: string[],
  users: Record<string, ChatPresenceState> | undefined,
  now: number
): ChatPresenceSummary {
  if (targetIds.length === 0) {
    return { availability: "offline", label: "Offline" };
  }

  const onlineCount = targetIds.filter(function (userId) {
    return users?.[userId]?.status === "online";
  }).length;
  if (onlineCount > 0) {
    return {
      availability: "online",
      label: targetIds.length === 1 ? "Online" : String(onlineCount) + " online",
    };
  }

  let latestLastSeen: string | null = null;
  for (var userId of targetIds) {
    const lastSeenAt = users?.[userId]?.lastSeenAt ?? null;
    if (!lastSeenAt) {
      continue;
    }
    if (!latestLastSeen || new Date(lastSeenAt).getTime() > new Date(latestLastSeen).getTime()) {
      latestLastSeen = lastSeenAt;
    }
  }

  if (!latestLastSeen) {
    return { availability: "offline", label: "Offline" };
  }

  const lastSeenMs = new Date(latestLastSeen).getTime();
  if (!Number.isFinite(lastSeenMs) || now - lastSeenMs > AWAY_WINDOW_MS) {
    return { availability: "offline", label: "Offline" };
  }

  return {
    availability: "away",
    label: formatActiveAgo(latestLastSeen, now),
  };
}

export function useChatPresenceSummary(
  members: ChatParticipant[] | undefined
): ChatPresenceSummary {
  const { currentUserId } = useChatRealtime();
  const targetIds = useMemo(
    function () {
      return getChatPresenceTargetIds(members, currentUserId);
    },
    [currentUserId, members]
  );
  const presence = useChatPresence(targetIds, {
    enabled: targetIds.length > 0,
  });
  const [now, setNow] = useState(Date.now());

  useEffect(function () {
    const intervalId = window.setInterval(function () {
      setNow(Date.now());
    }, 60_000);
    return function () {
      window.clearInterval(intervalId);
    };
  }, []);

  return useMemo(
    function () {
      return summarizeChatPresence(targetIds, presence.data, now);
    },
    [now, presence.data, targetIds]
  );
}

export function ChatPresenceDot({
  availability,
  className,
}: {
  availability: ChatPresenceAvailability;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-bg",
        availability === "online" && "bg-[#22c55e]",
        availability === "away" && "bg-[#f5c542]",
        availability === "offline" &&
          "bg-neutral-400 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.10)] dark:bg-neutral-500 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]",
        className
      )}
      aria-hidden="true"
    />
  );
}
