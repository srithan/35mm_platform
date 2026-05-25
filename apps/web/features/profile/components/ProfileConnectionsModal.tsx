"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/EmptyState";
import { Dialog } from "@/components/Dialog/Dialog";
import { UserCard } from "@/components/UserCard";
import { fetchProfileConnections } from "@/features/profile/api/profileApi";

export function ProfileConnectionsModal({
  open,
  onClose,
  username,
  kind,
  isOwnProfile,
  displayName,
  followerCount,
  followingCount,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  kind: "followers" | "following";
  isOwnProfile: boolean;
  displayName: string;
  followerCount: number;
  followingCount: number;
}) {
  const title = kind === "followers" ? "Followers" : "Following";
  const placeholder =
    kind === "followers" ? "Search followers…" : "Search following…";
  const { getToken, isLoaded } = useAuth();
  const [queryText, setQueryText] = useState("");
  const connectionsQuery = useInfiniteQuery({
    queryKey: ["profile", "connections", username, kind],
    queryFn: async function ({ pageParam }) {
      return fetchProfileConnections({
        username,
        kind,
        cursor: pageParam as string | undefined,
        token: await getToken(),
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    enabled: open && isLoaded && username.trim().length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const allConnections = connectionsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const filteredConnections = useMemo(
    function () {
      var needle = queryText.trim().toLowerCase();
      if (!needle) return allConnections;
      return allConnections.filter(function (user) {
        return (
          user.username.toLowerCase().includes(needle) ||
          user.displayName.toLowerCase().includes(needle)
        );
      });
    },
    [allConnections, queryText]
  );
  const hasConnections = allConnections.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-md"
      contentClassName="p-0 flex flex-col max-h-[min(520px,85vh)]"
    >
      <div className="shrink-0 border-b border-border px-5 py-3">
        <input
          type="search"
          placeholder={placeholder}
          disabled={connectionsQuery.isPending || (!hasConnections && queryText.trim().length === 0)}
          value={queryText}
          onChange={(event) => setQueryText(event.target.value)}
          className="w-full border-none bg-transparent font-sans text-[16px] md:text-sm text-fg outline-none placeholder:text-fg-muted focus-visible:ring-0"
          aria-label={placeholder}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {connectionsQuery.isPending ? (
          <div className="py-6 text-sm text-fg-muted">Loading…</div>
        ) : connectionsQuery.isError ? (
          <div className="py-6 text-sm text-fg-muted">Could not load right now.</div>
        ) : filteredConnections.length > 0 ? (
          <>
            {filteredConnections.map((u) => (
            <UserCard
              key={u.userId}
              username={u.username}
              handle={`@${u.username}`}
              role={u.displayName}
              initial={(u.displayName || u.username).charAt(0).toUpperCase()}
              showFollowButton={false}
            />
            ))}
            {connectionsQuery.hasNextPage ? (
              <div className="py-3">
                <button
                  type="button"
                  onClick={() => void connectionsQuery.fetchNextPage()}
                  disabled={connectionsQuery.isFetchingNextPage}
                  className="text-xs text-fg-muted hover:text-fg"
                >
                  {connectionsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : null}
          </>
        ) : queryText.trim().length > 0 ? (
          <EmptyState
            size="md"
            icon={<span className="text-[22px]">🔎</span>}
            headline="No matches found"
          />
        ) : kind === "following" ? (
          <EmptyState
            size="md"
            icon={<span className="text-[22px]">👥</span>}
            headline={
              isOwnProfile
                ? "You're not following anyone yet"
                : `${displayName} isn't following anyone yet`
            }
            primaryCta={
              isOwnProfile
                ? { label: "Find people", href: "/suggestions/people" }
                : undefined
            }
          />
        ) : (
          <EmptyState
            size="md"
            icon={<span className="text-[22px]">✨</span>}
            headline={
              isOwnProfile
                ? "Nobody's following you yet — keep posting"
                : `${displayName} doesn't have any followers yet`
            }
          />
        )}
      </div>
    </Dialog>
  );
}
