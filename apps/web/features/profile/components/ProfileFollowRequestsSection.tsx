"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
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

export function ProfileFollowRequestsSection(props: { username: string }) {
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
  const hasItems = requests.length > 0;

  const handleLoadMore = function () {
    if (!followRequestsQuery.hasNextPage || followRequestsQuery.isFetchingNextPage) return;
    void followRequestsQuery.fetchNextPage();
  };

  if (!isLoaded || followRequestsQuery.isLoading) {
    return <div className="px-0 py-3 text-sm text-fg-muted">Loading follow requests…</div>;
  }

  if (followRequestsQuery.isError) {
    return (
      <div className="px-0 py-3 text-sm text-fg-muted">
        Could not load follow requests.
      </div>
    );
  }

  if (!hasItems) {
    return null;
  }

  return (
    <section className="border-b border-border bg-bg px-0 py-4">
      <h2 className="mb-3 text-[15px] font-semibold text-fg">Follow requests</h2>
      <div className="divide-y divide-border rounded-xl border border-border bg-sunken">
        {requests.map(function (request) {
          const isProcessing =
            (acceptMutation.isPending && acceptMutation.variables === request.userId) ||
            (declineMutation.isPending && declineMutation.variables === request.userId);

          return (
            <div key={request.userId} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar
                src={request.avatarUrl}
                initial={toInitial(request.displayName || request.username)}
                size="sm"
                className="h-8 w-8 text-xs"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${request.username}`}
                  className="truncate text-[13px] font-bold text-fg hover:underline"
                >
                  {request.displayName || request.username}
                </Link>
                <div className="text-xs text-fg-muted">@{request.username}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => {
                    if (declineMutation.isPending) return;
                    declineMutation.mutate(request.userId);
                  }}
                >
                  {declineMutation.isPending && declineMutation.variables === request.userId
                    ? "Ignoring..."
                    : "Ignore"}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => {
                    if (acceptMutation.isPending) return;
                    acceptMutation.mutate(request.userId);
                  }}
                >
                  {acceptMutation.isPending && acceptMutation.variables === request.userId
                    ? "Accepting..."
                    : "Accept"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {followRequestsQuery.hasNextPage ? (
        <div className="mt-3 text-right">
          <Button
            variant="ghost"
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
