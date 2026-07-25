"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Search, UserRoundCheck, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useIncomingFollowRequests } from "@/features/profile/hooks/useProfile";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { notificationsKeys } from "@/features/notifications/hooks/queryKeys";
import {
  acceptFollowRequest,
  declineFollowRequest,
} from "@/features/notifications/api/notificationsApi";

function toInitial(input: string, fallback = "?") {
  var trimmed = input.trim();
  if (trimmed.length === 0) return fallback;
  return trimmed.charAt(0).toUpperCase();
}

export function ProfileFollowRequestsSection(props: { username: string; query?: string }) {
  const { getToken, isLoaded } = useAuth();
  const queryClient = useQueryClient();

  const followRequestsQuery = useIncomingFollowRequests(props.username);

  const acceptMutation = useMutation({
    mutationFn: async function (userId: string) {
      return acceptFollowRequest({
        token: await getToken(),
        userId,
      });
    },
    onSuccess: async function () {
      await queryClient.invalidateQueries({ queryKey: profileKeys.followRequests(props.username) });
      await queryClient.invalidateQueries({ queryKey: profileKeys.detail(props.username) });
      await queryClient.invalidateQueries({ queryKey: profileKeys.followers(props.username) });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async function (userId: string) {
      return declineFollowRequest({
        token: await getToken(),
        userId,
      });
    },
    onSuccess: async function () {
      await queryClient.invalidateQueries({ queryKey: profileKeys.followRequests(props.username) });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.content() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.preview() });
      await queryClient.invalidateQueries({ queryKey: notificationsKeys.unread() });
    },
  });

  const requests: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  }> = (followRequestsQuery.data?.pages.flatMap(function (page) {
    return page.items;
  }) ?? []);
  const queryText = props.query?.trim().toLowerCase() ?? "";
  const filteredRequests = requests.filter(function (request) {
    if (!queryText) return true;
    return (
      request.username.toLowerCase().includes(queryText) ||
      request.displayName.toLowerCase().includes(queryText)
    );
  });
  const hasItems = filteredRequests.length > 0;

  const handleLoadMore = function () {
    if (!followRequestsQuery.hasNextPage || followRequestsQuery.isFetchingNextPage) return;
    void followRequestsQuery.fetchNextPage();
  };

  if ((!isLoaded || followRequestsQuery.isLoading) && requests.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-fg-muted">
        <LoaderCircle className="h-5 w-5 animate-spin" aria-label="Loading follow requests" />
      </div>
    );
  }

  if (followRequestsQuery.isError && requests.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-5 text-center">
        <p className="text-[14px] font-semibold text-fg">Couldn&apos;t load requests</p>
        <p className="mt-1.5 text-[12.5px] text-fg-muted">Try closing this view and opening it again.</p>
      </div>
    );
  }

  if (!hasItems) {
    return (
      <EmptyState
        size="md"
        className="h-full justify-center px-5"
        icon={
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken">
            {queryText ? (
              <Search className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
            ) : (
              <UserRoundCheck className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
            )}
          </span>
        }
        headline={queryText ? "No matches" : "You’re all caught up"}
        subline={
          queryText
            ? `No loaded requests match “${props.query?.trim()}.”`
            : "New follow requests will appear here."
        }
      />
    );
  }

  return (
    <section className="p-2" aria-label="Follow requests">
      <div className="space-y-1">
        {filteredRequests.map(function (request) {
          const isProcessing =
            (acceptMutation.isPending && acceptMutation.variables === request.userId) ||
            (declineMutation.isPending && declineMutation.variables === request.userId);

          return (
            <div
              key={request.userId}
              className="flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-hover"
            >
              <Avatar
                src={request.avatarUrl}
                initial={toInitial(request.displayName || request.username)}
                size="lg"
                className="h-11 w-11"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${request.username}`}
                  className="block truncate text-[14px] font-semibold leading-tight text-fg no-underline hover:underline"
                >
                  {request.displayName || request.username}
                </Link>
                <div className="mt-1 truncate font-sans text-[11px] text-fg-muted">
                  @{request.username}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-fg-muted hover:text-fg"
                  disabled={isProcessing}
                  onClick={() => {
                    if (declineMutation.isPending) return;
                    declineMutation.mutate(request.userId);
                  }}
                >
                  {declineMutation.isPending && declineMutation.variables === request.userId ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                  )}
                  <span className="sr-only">Decline @{request.username}</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-9 px-3.5"
                  disabled={isProcessing}
                  onClick={() => {
                    if (acceptMutation.isPending) return;
                    acceptMutation.mutate(request.userId);
                  }}
                >
                  {acceptMutation.isPending && acceptMutation.variables === request.userId ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  )}
                  Accept
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {followRequestsQuery.hasNextPage ? (
        <div className="flex justify-center px-5 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={followRequestsQuery.isFetchingNextPage || followRequestsQuery.isLoading}
            onClick={handleLoadMore}
          >
            {followRequestsQuery.isFetchingNextPage ? "Loading more..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
