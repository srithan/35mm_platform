"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ShieldOff, VolumeX, type LucideIcon } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { feedKeys } from "@/features/feed/hooks/queryKeys";
import {
  fetchMyBlocks,
  fetchMyMutes,
  unblockUser,
  unmuteUser,
  type ModeratedUser,
} from "@/features/profile/api/profileApi";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { privacyKeys } from "../hooks/queryKeys";

export type SettingsModerationListKind = "blocked" | "muted";

interface SettingsModerationListPanelProps {
  kind: SettingsModerationListKind;
}

const COPY = {
  blocked: {
    emptyTitle: "No blocked accounts",
    emptyBody:
      "When you block someone, they will show up here with controls to unblock them.",
    loading: "Loading blocked accounts...",
    action: "Unblock",
    description: "Blocked accounts cannot see your profile, posts, or message you.",
    emptyIcon: ShieldOff,
    emptySignals: ["Profile protected", "Messages limited", "Easy unblock"],
  },
  muted: {
    emptyTitle: "No muted accounts",
    emptyBody:
      "Muted accounts will appear here when you hide their posts from your feed.",
    loading: "Loading muted accounts...",
    action: "Unmute",
    description: "Muted accounts stay on the platform, but their posts are hidden from your feed.",
    emptyIcon: VolumeX,
    emptySignals: ["Feed stays clean", "They are not notified", "Easy unmute"],
  },
} as const;

function ModerationUserRow({
  user,
  actionLabel,
  actionPending,
  onAction,
}: {
  user: ModeratedUser;
  actionLabel: string;
  actionPending: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar
          initial={user.displayName[0] ?? user.username[0]}
          src={user.avatarUrl}
          size="lg"
          className="shrink-0"
        />
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold leading-5 text-fg">
            {user.displayName}
          </div>
          <div className="truncate text-[12px] leading-4 text-fg-muted">
            @{user.username}
          </div>
          {user.bio ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-fg-muted">
              {user.bio}
            </p>
          ) : null}
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="shrink-0"
        onClick={onAction}
        disabled={actionPending}
      >
        {actionPending ? "..." : actionLabel}
      </Button>
    </div>
  );
}

function SettingsModerationEmptyState({ kind }: { kind: SettingsModerationListKind }) {
  const copy = COPY[kind];
  const Icon = copy.emptyIcon as LucideIcon;

  return (
    <div className="py-10 sm:py-12" role="status">
      <div className="mx-auto flex max-w-[420px] flex-col items-center text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-gradient-to-br from-sunken to-bg shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_5%,transparent)]">
          <Icon className="h-6 w-6 text-fg-muted" strokeWidth={1.8} aria-hidden />
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-bg bg-elevated text-accent shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden />
          </span>
        </div>
        <h3 className="text-[15px] font-semibold leading-5 text-fg">
          {copy.emptyTitle}
        </h3>
        <p className="mt-2 max-w-[340px] text-[12.5px] leading-relaxed text-fg-muted">
          {copy.emptyBody}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2" aria-hidden>
          {copy.emptySignals.map((signal) => (
            <span
              key={signal}
              className="rounded-full border border-border bg-sunken px-2.5 py-1 text-[11px] font-medium leading-none text-fg-muted"
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsModerationListPanel({ kind }: SettingsModerationListPanelProps) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const copy = COPY[kind];
  const queryKey = kind === "blocked" ? privacyKeys.blocks() : privacyKeys.mutes();

  const listQuery = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const token = await getToken();
      return kind === "blocked"
        ? fetchMyBlocks(token, { cursor: pageParam, limit: 30 })
        : fetchMyMutes(token, { cursor: pageParam, limit: 30 });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const items = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data]
  );

  const actionMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = await getToken();
      if (kind === "blocked") {
        await unblockUser(userId, token);
      } else {
        await unmuteUser(userId, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });

  if (listQuery.isLoading) {
    return <p className="text-sm text-fg-muted">{copy.loading}</p>;
  }

  if (listQuery.isError) {
    return (
      <div className="rounded-xl border border-accent/25 bg-sunken px-4 py-3">
        <p className="text-[12.5px] text-accent">
          Could not load {kind} accounts.
        </p>
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void listQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-[13px] leading-relaxed text-fg-muted">
        {copy.description}
      </p>
      {items.length === 0 ? (
        <SettingsModerationEmptyState kind={kind} />
      ) : (
        <div>
          {items.map((item) => (
            <ModerationUserRow
              key={item.userId}
              user={item}
              actionLabel={copy.action}
              actionPending={actionMutation.isPending}
              onAction={() => actionMutation.mutate(item.userId)}
            />
          ))}
        </div>
      )}
      {listQuery.hasNextPage ? (
        <div className="pt-4">
          <Button
            size="sm"
            variant="secondary"
            disabled={listQuery.isFetchingNextPage}
            onClick={() => {
              void listQuery.fetchNextPage();
            }}
          >
            {listQuery.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
