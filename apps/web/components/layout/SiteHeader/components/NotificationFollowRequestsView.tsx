"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type Ref } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import {
  acceptFollowRequest,
  declineFollowRequest,
  fetchReceivedFollowRequests,
  type ReceivedFollowRequest,
} from "@/features/notifications/api/notificationsApi";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import { cn } from "@/lib/utils/cn";
import styles from "../SiteHeader.module.css";

const AVATAR_STACK_MIN = 2;
const AVATAR_STACK_LIMIT = 3;

function initialFor(value: string) {
  return (value.trim().charAt(0) || "?").toUpperCase();
}

function requestLabel(request: ReceivedFollowRequest | undefined) {
  if (!request) return "Someone";
  return request.displayName || request.username || "Someone";
}

function entrySummaryText(requests: ReceivedFollowRequest[], total: number) {
  if (total <= 0) return "";
  const first = requests[0];
  if (!first) {
    return total === 1 ? "1 request" : `${total} requests`;
  }
  if (total === 1) return requestLabel(first);
  const second = requests[1];
  if (total === 2 && second) {
    return `${requestLabel(first)} + ${requestLabel(second)}`;
  }
  const othersCount = Math.max(1, total - 1);
  return `${requestLabel(first)} + ${othersCount} others`;
}

function invalidateFollowRequestQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.followRequests() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.followRequestTotal() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
}

function useFollowRequestsList(enabled: boolean) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [extraRequests, setExtraRequests] = useState<ReceivedFollowRequest[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = useQuery({
    queryKey: notificationsKeys.followRequests(),
    queryFn: async function () {
      return fetchReceivedFollowRequests({ token: await getToken(), limit: 20 });
    },
    enabled: enabled && isLoaded && Boolean(isSignedIn),
    staleTime: 60_000,
  });

  function removeRequest(requesterId: string) {
    queryClient.setQueryData<{
      requests: ReceivedFollowRequest[];
      total: number;
      nextCursor: string | null;
    }>(notificationsKeys.followRequests(), function (current) {
      if (!current) return current;
      return {
        ...current,
        requests: current.requests.filter(function (request) {
          return request.requesterId !== requesterId;
        }),
        total: Math.max(0, current.total - 1),
      };
    });
    queryClient.setQueryData<{
      requests: ReceivedFollowRequest[];
      total: number;
      nextCursor: string | null;
    }>(notificationsKeys.followRequestTotal(), function (current) {
      if (!current) return current;
      return {
        ...current,
        requests: current.requests.filter(function (request) {
          return request.requesterId !== requesterId;
        }),
        total: Math.max(0, current.total - 1),
      };
    });
    setExtraRequests(function (current) {
      return current.filter(function (request) {
        return request.requesterId !== requesterId;
      });
    });
  }

  const acceptMutation = useMutation({
    mutationFn: async function (requesterId: string) {
      return acceptFollowRequest({ token: await getToken(), userId: requesterId });
    },
    onMutate: removeRequest,
    onSettled: function () {
      invalidateFollowRequestQueries(queryClient);
    },
  });

  const declineMutation = useMutation({
    mutationFn: async function (requesterId: string) {
      return declineFollowRequest({ token: await getToken(), userId: requesterId });
    },
    onMutate: removeRequest,
    onSettled: function () {
      invalidateFollowRequestQueries(queryClient);
    },
  });

  const baseRequests = useMemo(
    function () {
      return query.data?.requests ?? [];
    },
    [query.data?.requests]
  );
  const total = query.data?.total ?? 0;

  const allRequests = useMemo(
    function () {
      const seen = new Set<string>();
      const merged: ReceivedFollowRequest[] = [];

      for (let index = 0; index < baseRequests.length; index += 1) {
        const request = baseRequests[index];
        if (seen.has(request.requesterId)) continue;
        seen.add(request.requesterId);
        merged.push(request);
      }

      for (let index = 0; index < extraRequests.length; index += 1) {
        const request = extraRequests[index];
        if (seen.has(request.requesterId)) continue;
        seen.add(request.requesterId);
        merged.push(request);
      }

      return merged;
    },
    [baseRequests, extraRequests]
  );

  const resolvedNextCursor = nextCursor ?? query.data?.nextCursor ?? null;

  async function loadMoreRequests() {
    if (!resolvedNextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const page = await fetchReceivedFollowRequests({
        token: await getToken(),
        limit: 20,
        cursor: resolvedNextCursor,
      });
      setExtraRequests(function (current) {
        return current.concat(page.requests);
      });
      setNextCursor(page.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    query,
    allRequests,
    total,
    hasMore: Boolean(resolvedNextCursor),
    loadingMore,
    loadMoreRequests,
    acceptMutation,
    declineMutation,
  };
}

type FollowRequestsEntryRowProps = {
  followRequestTotal: number;
  notifRows: Array<{ type: string; actor?: { username?: string | null; displayName?: string | null; avatarUrl?: string | null } | null }>;
  onOpen: () => void;
};

export function FollowRequestsEntryRow({
  followRequestTotal,
  notifRows,
  onOpen,
}: FollowRequestsEntryRowProps) {
  const list = useFollowRequestsList(true);
  const followRequestNotifs = notifRows.filter(function (row) {
    return row.type === "follow_request";
  });
  const total = Math.max(followRequestTotal, list.total, followRequestNotifs.length);
  const requestsFromNotifs = followRequestNotifs.map(function (row, index) {
    return {
      requesterId: String(index),
      username: row.actor?.username ?? "user",
      displayName: row.actor?.displayName || row.actor?.username || "Someone",
      avatarUrl: row.actor?.avatarUrl ?? null,
      mutualFollowerCount: 0,
      requestedAt: "",
    };
  });
  const summarySource =
    list.allRequests.length > 0 ? list.allRequests : requestsFromNotifs;
  const summary = entrySummaryText(summarySource, total);
  const realStack = summarySource.slice(0, AVATAR_STACK_LIMIT);
  const stackCount = Math.max(AVATAR_STACK_MIN, Math.min(AVATAR_STACK_LIMIT, realStack.length || AVATAR_STACK_MIN));
  const placeholderCount = Math.max(0, stackCount - realStack.length);

  if (total <= 0) return null;

  return (
    <li className={styles.dropdownListItem}>
      <button
        type="button"
        className={cn(styles.dropdownRow, styles.followRequestsEntry)}
        onClick={onOpen}
        aria-label={`Follow requests, ${total}`}
      >
        <span className={styles.followRequestsAvatarStack} aria-hidden>
          {realStack.map(function (request, index) {
            return (
              <span
                key={request.requesterId}
                className={styles.followRequestsAvatar}
                style={{ zIndex: stackCount - index }}
              >
                <Avatar
                  src={request.avatarUrl}
                  initial={initialFor(request.displayName || request.username)}
                  size="sm"
                />
              </span>
            );
          })}
          {Array.from({ length: placeholderCount }).map(function (_, index) {
            return (
              <span
                key={"follow-request-placeholder-" + index}
                className={styles.followRequestsAvatar}
                style={{ zIndex: placeholderCount - index }}
              >
                <span className={styles.followRequestsAvatarPlaceholder} />
              </span>
            );
          })}
        </span>
        <span className={styles.dropdownRowMain}>
          <span className={styles.followRequestsEntryTitle}>Follow requests</span>
          <span className={styles.followRequestsEntrySummary}>
            {summary || (list.query.isPending ? "Loading…" : `${total} pending`)}
          </span>
        </span>
        <span className={styles.followRequestsEntryTrail} aria-hidden>
          <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-fg px-1.5 text-[11px] font-bold leading-none tabular-nums text-bg">
            {total > 99 ? "99+" : String(total)}
          </span>
          <ChevronRight size={16} strokeWidth={2} />
        </span>
      </button>
    </li>
  );
}

type NotificationFollowRequestsViewProps = {
  listRef: Ref<HTMLUListElement>;
  onBack: () => void;
  onClose: () => void;
};

export function NotificationFollowRequestsView({
  listRef,
  onBack,
  onClose,
}: NotificationFollowRequestsViewProps) {
  const list = useFollowRequestsList(true);

  useEffect(
    function () {
      if (list.query.isPending || list.query.isError) return;
      if (list.total > 0) return;
      onBack();
    },
    [list.query.isError, list.query.isPending, list.total, onBack]
  );

  return (
    <>
      <div className={styles.notifPanelHeader}>
        <button
          type="button"
          className={styles.profileSubmenuBack}
          aria-label="Back to notifications"
          onClick={onBack}
        >
          <ChevronLeft size={18} strokeWidth={2} aria-hidden />
        </button>
        <h2 className={styles.notifPanelHeadingFollowRequests}>Follow requests</h2>
        <span className={styles.notifPanelHeaderSpacer} aria-hidden />
      </div>
      <ul
        ref={listRef}
        className={styles.notifList}
        role="list"
        aria-busy={list.query.isPending}
        aria-live="polite"
        aria-label="Follow requests"
      >
        {list.query.isPending && list.allRequests.length === 0 ? (
          <li className={cn(styles.dropdownListItem, styles.followRequestsFillState)}>
            <div className={styles.dropdownEmptyState} role="status">
              <p className={styles.dropdownEmptyHeadline}>Loading requests…</p>
            </div>
          </li>
        ) : list.query.isError && list.allRequests.length === 0 ? (
          <li className={cn(styles.dropdownListItem, styles.followRequestsFillState)}>
            <div className={styles.dropdownEmptyState} role="status">
              <p className={styles.dropdownEmptyHeadline}>Couldn&apos;t load requests</p>
              <p className={styles.dropdownEmptySubline}>Close and open again to retry.</p>
            </div>
          </li>
        ) : list.allRequests.length === 0 ? (
          <li className={cn(styles.dropdownListItem, styles.followRequestsFillState)}>
            <div className={styles.dropdownEmptyState} role="status">
              <p className={styles.dropdownEmptyHeadline}>No follow requests</p>
            </div>
          </li>
        ) : (
          list.allRequests.map(function (request) {
            const pendingAccept =
              list.acceptMutation.isPending &&
              list.acceptMutation.variables === request.requesterId;
            const pendingDecline =
              list.declineMutation.isPending &&
              list.declineMutation.variables === request.requesterId;
            const busy = pendingAccept || pendingDecline;

            return (
              <li key={request.requesterId} className={styles.dropdownListItem}>
                <div className="flex w-full flex-row flex-nowrap items-center gap-3 border-b border-border/70 bg-transparent px-3.5 py-3.5">
                  <Link
                    href={`/${request.username}`}
                    className="shrink-0 rounded-full"
                    onClick={onClose}
                  >
                    <Avatar
                      src={request.avatarUrl}
                      initial={initialFor(request.displayName || request.username)}
                      size="md"
                      className="h-10 w-10 text-sm"
                    />
                  </Link>
                  <div className="min-w-0 flex-1 py-0.5">
                    <Link
                      href={`/${request.username}`}
                      className="block truncate text-[13.5px] font-semibold leading-snug tracking-[-0.01em] text-fg hover:underline"
                      onClick={onClose}
                    >
                      {request.displayName || request.username}
                    </Link>
                    <div className="mt-0.5 truncate text-[12px] leading-snug text-fg-muted">
                      @{request.username}
                      {request.mutualFollowerCount > 0
                        ? ` · ${request.mutualFollowerCount} mutual`
                        : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 pl-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={function () {
                        list.declineMutation.mutate(request.requesterId);
                      }}
                    >
                      {pendingDecline ? "…" : "Decline"}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busy}
                      onClick={function () {
                        list.acceptMutation.mutate(request.requesterId);
                      }}
                    >
                      {pendingAccept ? "…" : "Accept"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })
        )}
        {list.hasMore ? (
          <li className={styles.dropdownListItem}>
            <button
              type="button"
              className={styles.followRequestsLoadMore}
              disabled={list.loadingMore}
              onClick={function () {
                void list.loadMoreRequests();
              }}
            >
              {list.loadingMore ? "Loading…" : "Load more"}
            </button>
          </li>
        ) : null}
      </ul>
    </>
  );
}
