"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
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

const PREVIEW_COUNT = 3;
const AVATAR_STACK_LIMIT = 3;

function initialFor(value: string) {
  return (value.trim().charAt(0) || "?").toUpperCase();
}

function requestLabel(request: ReceivedFollowRequest) {
  return request.displayName || request.username;
}

function summaryText(requests: ReceivedFollowRequest[], total: number) {
  if (total <= 0) return "";
  if (total === 1) {
    return `${requestLabel(requests[0])} requested to follow you`;
  }
  if (total === 2) {
    return `${requestLabel(requests[0])} and ${requestLabel(requests[1])} requested to follow you`;
  }
  const othersCount = total - 2;
  return `${requestLabel(requests[0])}, ${requestLabel(requests[1])} and ${othersCount} other${othersCount === 1 ? "" : "s"} requested to follow you`;
}

function invalidateFollowRequestQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.followRequests() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.followRequestTotal() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
  void queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
}

function FollowRequestRow(props: {
  request: ReceivedFollowRequest;
  pendingAccept: boolean;
  pendingDecline: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { request, pendingAccept, pendingDecline, onAccept, onDecline } = props;
  const busy = pendingAccept || pendingDecline;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Link href={`/${request.username}`} className="shrink-0">
        <Avatar
          src={request.avatarUrl}
          initial={initialFor(request.displayName || request.username)}
          className="h-9 w-9 text-xs"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/${request.username}`}
          className="block truncate text-[13px] font-bold text-fg hover:underline"
        >
          {request.displayName || request.username}
        </Link>
        <div className="truncate text-[12px] text-fg-muted">
          @{request.username}
          {request.mutualFollowerCount > 0
            ? ` · ${request.mutualFollowerCount} mutual follower${request.mutualFollowerCount === 1 ? "" : "s"}`
            : ""}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" disabled={busy} onClick={onDecline}>
          {pendingDecline ? "Declining…" : "Decline"}
        </Button>
        <Button variant="primary" size="sm" disabled={busy} onClick={onAccept}>
          {pendingAccept ? "Accepting…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}

export function FollowRequestsTray() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [extraRequests, setExtraRequests] = useState<ReceivedFollowRequest[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const query = useQuery({
    queryKey: notificationsKeys.followRequests(),
    queryFn: async function () {
      return fetchReceivedFollowRequests({ token: await getToken(), limit: 20 });
    },
    enabled: isLoaded && Boolean(isSignedIn),
    staleTime: 15_000,
    refetchInterval: 10_000,
  });

  function removeRequest(requesterId: string) {
    queryClient.setQueryData<{ requests: ReceivedFollowRequest[]; total: number; nextCursor: string | null }>(
      notificationsKeys.followRequests(),
      function (current) {
        if (!current) return current;
        return {
          ...current,
          requests: current.requests.filter(function (request) {
            return request.requesterId !== requesterId;
          }),
          total: Math.max(0, current.total - 1),
        };
      }
    );
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

  const baseRequests = query.data?.requests ?? [];
  const total = query.data?.total ?? 0;

  const allRequests = useMemo(function () {
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
  }, [baseRequests, extraRequests]);

  const resolvedNextCursor = nextCursor ?? query.data?.nextCursor ?? null;
  const hasMore = Boolean(resolvedNextCursor);
  const canExpand = total > PREVIEW_COUNT || hasMore;
  const visibleRequests = expanded ? allRequests : allRequests.slice(0, PREVIEW_COUNT);
  const hiddenCount = Math.max(0, total - visibleRequests.length);
  const stackRequests = allRequests.slice(0, AVATAR_STACK_LIMIT);

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

  if (query.isLoading || total === 0) return null;

  return (
    <section className="mb-5 px-4">
      <div className="overflow-hidden rounded-xl border border-border bg-bg">
        <div className="flex items-center gap-3 border-b border-border px-3.5 py-3">
          <div className="flex shrink-0 items-center">
            {stackRequests.map(function (request, index) {
              return (
                <div
                  key={request.requesterId}
                  className={cn("relative rounded-full ring-2 ring-bg", index > 0 && "-ml-2.5")}
                  style={{ zIndex: stackRequests.length - index }}
                >
                  <Avatar
                    src={request.avatarUrl}
                    initial={initialFor(request.displayName || request.username)}
                    size="sm"
                    className="h-8 w-8 text-[11px]"
                  />
                </div>
              );
            })}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">
                Follow requests
              </h2>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
                {total}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-fg-muted">
              {summaryText(allRequests, total)}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {visibleRequests.map(function (request) {
            const pendingAccept =
              acceptMutation.isPending && acceptMutation.variables === request.requesterId;
            const pendingDecline =
              declineMutation.isPending && declineMutation.variables === request.requesterId;

            return (
              <FollowRequestRow
                key={request.requesterId}
                request={request}
                pendingAccept={pendingAccept}
                pendingDecline={pendingDecline}
                onAccept={function () {
                  acceptMutation.mutate(request.requesterId);
                }}
                onDecline={function () {
                  declineMutation.mutate(request.requesterId);
                }}
              />
            );
          })}
        </div>

        {canExpand || hasMore ? (
          <div className="border-t border-border px-3 py-2">
            {!expanded && hiddenCount > 0 ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                onClick={function () {
                  setExpanded(true);
                }}
              >
                Show all {total} requests
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
            {expanded && hasMore ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={loadingMore}
                onClick={loadMoreRequests}
              >
                {loadingMore ? "Loading more…" : "Load more requests"}
              </Button>
            ) : null}
            {expanded && total > PREVIEW_COUNT ? (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold text-fg-muted transition-colors hover:bg-hover hover:text-fg"
                onClick={function () {
                  setExpanded(false);
                }}
              >
                Show less
                <ChevronDown className="h-3.5 w-3.5 rotate-180" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
