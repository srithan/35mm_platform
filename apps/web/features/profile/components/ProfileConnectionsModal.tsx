"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  LoaderCircle,
  RotateCw,
  Search,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { Dialog } from "@/components/Dialog/Dialog";
import {
  fetchProfileConnections,
  followUser,
  unfollowUser,
  type CurrentUserProfile,
  type ProfileConnectionUser,
  type PublicProfile,
} from "@/features/profile/api/profileApi";
import { authKeys } from "@/features/auth/hooks/queryKeys";
import { ProfileFollowRequestsSection } from "@/features/profile/components/ProfileFollowRequestsSection";
import { profileKeys } from "@/features/profile/hooks/queryKeys";
import { useCurrentUserProfile } from "@/features/profile/hooks/useCurrentUserProfile";
import { cn } from "@/lib/utils/cn";
import { formatCount } from "@/lib/utils/formatCount";

function initialForName(value: string): string {
  var trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
}

type ConnectionsPage = {
  items: ProfileConnectionUser[];
  nextCursor: string | null;
  hasMore: boolean;
  viewerOwnsProfile?: boolean;
};

type ConnectionsView = "followers" | "following" | "requests";

function ConnectionSkeleton({ showAction }: { showAction: boolean }) {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl px-3 py-2.5">
      <div className="h-11 w-11 shrink-0 rounded-full bg-sunken-2" />
      <div className="min-w-0 flex-1">
        <div className="h-3.5 w-32 rounded-full bg-sunken-2" />
        <div className="mt-2 h-2.5 w-20 rounded-full bg-sunken-2" />
      </div>
      {showAction ? <div className="h-8 w-20 rounded-full bg-sunken-2" /> : null}
    </div>
  );
}

function ConnectionsTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex min-h-11 items-center gap-2 px-0 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]",
        active ? "text-fg" : "text-fg-muted hover:text-fg"
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span className="font-sans text-[10px] font-normal tabular-nums text-fg-faint">
          {formatCount(count)}
        </span>
      ) : null}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-film-red",
          active ? "block" : "hidden"
        )}
        aria-hidden
      />
    </button>
  );
}

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
  const [activeView, setActiveView] = useState<ConnectionsView>(kind);
  const activeKind: "followers" | "following" =
    activeView === "following" ? "following" : "followers";
  const isRequestsView = isOwnProfile && activeView === "requests";
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const currentUserQuery = useCurrentUserProfile();
  const currentUser = currentUserQuery.data;
  const [queryText, setQueryText] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const connectionsQueryKey =
    activeKind === "followers" ? profileKeys.followers(username) : profileKeys.following(username);
  const connectionsQuery = useInfiniteQuery({
    queryKey: connectionsQueryKey,
    queryFn: async function ({ pageParam }) {
      return fetchProfileConnections({
        username,
        kind: activeKind,
        cursor: pageParam as string | undefined,
        token: await getToken(),
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: function (lastPage) {
      return lastPage.nextCursor ?? undefined;
    },
    enabled: open && !isRequestsView && isLoaded && username.trim().length > 0,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
  const viewerOwnsProfile =
    connectionsQuery.data?.pages[0]?.viewerOwnsProfile ?? isOwnProfile;
  const viewerUsername =
    currentUser?.username ?? (viewerOwnsProfile ? username : null);
  const canActOnFollowers = isLoaded && Boolean(isSignedIn);
  const unfollowMutation = useMutation({
    mutationFn: async function (user: ProfileConnectionUser) {
      var result = await unfollowUser(user.userId, await getToken());
      return { result, user };
    },
    onSuccess: async function ({ result, user }) {
      queryClient.setQueryData<InfiniteData<ConnectionsPage>>(
        profileKeys.followers(username),
        function (existing) {
          if (!existing) return existing;
          return {
            ...existing,
            pages: existing.pages.map(function (page) {
              return {
                ...page,
                items: page.items.map(function (item) {
                  return item.userId === user.userId
                    ? { ...item, followState: "none" }
                    : item;
                }),
              };
            }),
          };
        }
      );

      if (viewerUsername) {
        queryClient.setQueryData<InfiniteData<ConnectionsPage>>(
          profileKeys.following(viewerUsername),
          function (existing) {
            if (!existing) return existing;
            return {
              ...existing,
              pages: existing.pages.map(function (page) {
                return {
                  ...page,
                  items: page.items.filter(function (item) {
                    return item.userId !== user.userId;
                  }),
                };
              }),
            };
          }
        );
      }

      if (result.deleted) {
        queryClient.setQueryData<CurrentUserProfile>(authKeys.me(), function (profile) {
          if (!profile) return profile;
          return {
            ...profile,
            followingCount: Math.max(0, profile.followingCount - 1),
          };
        });
      }

      if (viewerUsername && result.deleted) {
        queryClient.setQueryData<PublicProfile | null>(
          profileKeys.detail(viewerUsername),
          function (profile) {
            if (!profile) return profile;
            return {
              ...profile,
              followingCount: Math.max(0, profile.followingCount - 1),
            };
          }
        );
      }

      queryClient.setQueryData<PublicProfile | null>(
        profileKeys.detail(user.username),
        function (profile) {
          if (!profile) return profile;
          return {
            ...profile,
            followState: "none",
            followerCount: result.deleted
              ? Math.max(0, profile.followerCount - 1)
              : profile.followerCount,
          };
        }
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.me() }),
        viewerUsername
          ? queryClient.invalidateQueries({
              queryKey: profileKeys.detail(viewerUsername),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: profileKeys.detail(user.username),
        }),
        viewerUsername
          ? queryClient.invalidateQueries({
              queryKey: profileKeys.following(viewerUsername),
              refetchType: "none",
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: profileKeys.followers(username),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: profileKeys.followers(user.username),
        }),
      ]);
    },
  });
  const followBackMutation = useMutation({
    mutationFn: async function (user: ProfileConnectionUser) {
      var result = await followUser(user.userId, await getToken());
      return { result, user };
    },
    onSuccess: async function ({ result, user }) {
      var nextFollowState: ProfileConnectionUser["followState"] =
        result.status === "pending" ? "requested" : "following";
      var counterDelta = result.status === "accepted" && result.created ? 1 : 0;

      queryClient.setQueryData<InfiniteData<ConnectionsPage>>(
        profileKeys.followers(username),
        function (existing) {
          if (!existing) return existing;
          return {
            ...existing,
            pages: existing.pages.map(function (page) {
              return {
                ...page,
                items: page.items.map(function (item) {
                  return item.userId === user.userId
                    ? { ...item, followState: nextFollowState }
                    : item;
                }),
              };
            }),
          };
        }
      );

      if (counterDelta !== 0) {
        queryClient.setQueryData<CurrentUserProfile>(authKeys.me(), function (profile) {
          if (!profile) return profile;
          return {
            ...profile,
            followingCount: Math.max(0, profile.followingCount + counterDelta),
          };
        });
        if (viewerUsername) {
          queryClient.setQueryData<PublicProfile | null>(
            profileKeys.detail(viewerUsername),
            function (profile) {
              if (!profile) return profile;
              return {
                ...profile,
                followingCount: Math.max(
                  0,
                  profile.followingCount + counterDelta
                ),
              };
            }
          );
        }
      }

      queryClient.setQueryData<PublicProfile | null>(
        profileKeys.detail(user.username),
        function (profile) {
          if (!profile) return profile;
          return {
            ...profile,
            followState: nextFollowState,
            followerCount: Math.max(0, profile.followerCount + counterDelta),
          };
        }
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.me() }),
        viewerUsername
          ? queryClient.invalidateQueries({
              queryKey: profileKeys.detail(viewerUsername),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: profileKeys.detail(user.username) }),
        viewerUsername
          ? queryClient.invalidateQueries({
              queryKey: profileKeys.following(viewerUsername),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: profileKeys.followers(user.username) }),
      ]);
    },
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

  const count = activeKind === "followers" ? followerCount : followingCount;
  const description =
    isRequestsView
      ? "Review who can follow your private profile."
      : activeKind === "followers"
        ? isOwnProfile
          ? `${count.toLocaleString()} ${count === 1 ? "person follows" : "people follow"} your work.`
          : `${count.toLocaleString()} ${count === 1 ? "person follows" : "people follow"} ${displayName}.`
        : isOwnProfile
          ? `You follow ${count.toLocaleString()} ${count === 1 ? "person" : "people"}.`
          : `${displayName} follows ${count.toLocaleString()} ${count === 1 ? "person" : "people"}.`;
  const searchLabel =
    isRequestsView ? "Search follow requests" : `Search loaded ${activeKind}`;

  useLayoutEffect(function () {
    if (open) {
      setActiveView(kind);
    }
  }, [kind, open]);

  useEffect(function () {
    setQueryText("");
  }, [activeView, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Connections"
      description={description}
      className="h-[min(640px,80dvh)] max-h-[80dvh] max-w-[34rem] rounded-[20px] font-sans max-sm:rounded-b-none max-sm:rounded-t-[24px]"
      containerClassName="max-sm:items-end max-sm:p-0"
      headerClassName="shrink-0 px-5 pb-4 pt-5"
      titleClassName="text-[21px] font-semibold leading-tight tracking-[-0.02em]"
      descriptionClassName="mt-1.5 max-w-[26rem] text-[12.5px]"
      contentClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0 sm:p-0"
      initialFocusRef={searchRef}
    >
      <div
        role="tablist"
        aria-label="Connection views"
        className="flex shrink-0 items-center gap-7 border-b border-border px-5"
      >
        <ConnectionsTab
          active={activeView === "followers"}
          count={followerCount}
          label="Followers"
          onClick={function () {
            setActiveView("followers");
          }}
        />
        <ConnectionsTab
          active={activeView === "following"}
          count={followingCount}
          label="Following"
          onClick={function () {
            setActiveView("following");
          }}
        />
        {isOwnProfile ? (
          <ConnectionsTab
            active={activeView === "requests"}
            label="Requests"
            onClick={function () {
              setActiveView("requests");
            }}
          />
        ) : null}
      </div>

      <div className="shrink-0 border-b border-border bg-elevated px-5 py-3">
        <label className="group relative block">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint transition-colors group-focus-within:text-fg"
            strokeWidth={1.8}
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            placeholder={
              isRequestsView
                ? "Search requests"
                : `Search ${activeKind}`
            }
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-border bg-sunken pl-10 pr-10 font-sans text-[16px] text-fg placeholder:text-fg-faint focus:border-border-strong md:text-[13px]"
            style={{ outline: "none", boxShadow: "none" }}
            aria-label={searchLabel}
          />
          {queryText ? (
            <button
              type="button"
              onClick={function () {
                setQueryText("");
                searchRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-elevated">
        {isRequestsView ? (
          <ProfileFollowRequestsSection username={username} query={queryText} />
        ) : connectionsQuery.isPending ? (
          <div className="space-y-1 p-2" aria-label={`Loading ${activeKind}`}>
            {Array.from({ length: 6 }, function (_, index) {
              return (
                <ConnectionSkeleton
                  key={index}
                  showAction={
                    activeKind === "followers"
                      ? canActOnFollowers
                      : viewerOwnsProfile
                  }
                />
              );
            })}
          </div>
        ) : connectionsQuery.isError && allConnections.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-5 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken text-fg-muted">
              <RotateCw className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-fg">
              Couldn&apos;t load {activeKind}
            </h3>
            <p className="mt-1.5 max-w-[17rem] text-[12.5px] leading-relaxed text-fg-muted">
              Connection list didn&apos;t arrive. Try again.
            </p>
            <button
              type="button"
              onClick={function () {
                void connectionsQuery.refetch();
              }}
              className="mt-4 rounded-full border border-border-strong px-4 py-2 text-[12px] font-semibold text-fg hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
            >
              Try again
            </button>
          </div>
        ) : filteredConnections.length > 0 ? (
          <div className="space-y-1 p-2" role="list" aria-label={activeKind}>
            {unfollowMutation.isError ? (
              <div
                className="mx-3 mb-2 rounded-lg bg-sunken px-3 py-2 text-[12px] text-fg"
                role="alert"
              >
                Couldn&apos;t unfollow that person. Try again.
              </div>
            ) : null}
            {followBackMutation.isError ? (
              <div
                className="mx-3 mb-2 rounded-lg bg-sunken px-3 py-2 text-[12px] text-fg"
                role="alert"
              >
                Couldn&apos;t follow that person. Try again.
              </div>
            ) : null}
            {filteredConnections.map((user) => (
              <div
                key={user.userId}
                role="listitem"
                className="flex min-h-[64px] items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-hover"
              >
                <Link
                  href={`/${user.username}`}
                  onClick={onClose}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                >
                  <Avatar
                    src={user.avatarUrl}
                    initial={initialForName(user.displayName || user.username)}
                    size="lg"
                    className="h-11 w-11"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold leading-tight text-fg">
                      {user.displayName || user.username}
                    </span>
                    <span className="mt-1 block truncate font-sans text-[11px] text-fg-muted">
                      @{user.username}
                    </span>
                  </span>
                </Link>
                {viewerOwnsProfile && activeKind === "following" ? (
                  <button
                    type="button"
                    onClick={function () {
                      unfollowMutation.mutate(user);
                    }}
                    disabled={unfollowMutation.isPending}
                    className="inline-flex h-8 min-w-[84px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated px-3 text-[12px] font-semibold text-fg hover:bg-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                  >
                    {unfollowMutation.isPending &&
                    unfollowMutation.variables?.userId === user.userId
                      ? "Unfollowing…"
                      : "Unfollow"}
                  </button>
                ) : null}
                {canActOnFollowers &&
                activeKind === "followers" &&
                user.followState === "none" ? (
                  <button
                    type="button"
                    onClick={function () {
                      followBackMutation.mutate(user);
                    }}
                    disabled={followBackMutation.isPending}
                    className="inline-flex h-8 min-w-[92px] shrink-0 items-center justify-center rounded-full border border-fg bg-fg px-3 text-[12px] font-semibold text-bg hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                  >
                    {followBackMutation.isPending &&
                    followBackMutation.variables?.userId === user.userId
                      ? "Following…"
                      : viewerOwnsProfile
                        ? "Follow back"
                        : "Follow"}
                  </button>
                ) : null}
                {canActOnFollowers &&
                activeKind === "followers" &&
                user.followState === "requested" ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-8 min-w-[92px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated px-3 text-[12px] font-semibold text-fg-muted opacity-75"
                  >
                    Requested
                  </button>
                ) : null}
                {canActOnFollowers &&
                activeKind === "followers" &&
                user.followState === "following" ? (
                  <button
                    type="button"
                    onClick={function () {
                      unfollowMutation.mutate(user);
                    }}
                    disabled={unfollowMutation.isPending}
                    className="inline-flex h-8 min-w-[84px] shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated px-3 text-[12px] font-semibold text-fg hover:bg-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                  >
                    {unfollowMutation.isPending &&
                    unfollowMutation.variables?.userId === user.userId
                      ? "Unfollowing…"
                      : "Unfollow"}
                  </button>
                ) : null}
              </div>
            ))}
            {connectionsQuery.hasNextPage ? (
              <div className="flex justify-center px-5 py-4">
                <button
                  type="button"
                  onClick={() => void connectionsQuery.fetchNextPage()}
                  disabled={connectionsQuery.isFetchingNextPage}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-border-strong bg-elevated px-4 text-[12px] font-semibold text-fg hover:bg-hover disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
                >
                  {connectionsQuery.isFetchingNextPage ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : null}
                  {connectionsQuery.isFetchingNextPage ? "Loading" : "Load more"}
                </button>
              </div>
            ) : null}
          </div>
        ) : queryText.trim().length > 0 ? (
          <EmptyState
            size="md"
            className="h-full justify-center px-5"
            icon={
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken">
                <Search className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
              </span>
            }
            headline="No matches"
            subline={`No loaded ${activeKind} match “${queryText.trim()}.”`}
          />
        ) : activeKind === "following" ? (
          <EmptyState
            size="md"
            className="h-full justify-center px-5"
            icon={
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken">
                <UserRoundPlus className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
              </span>
            }
            headline={isOwnProfile ? "Your watchlist of people is empty" : `No one here yet`}
            subline={
              isOwnProfile
                ? "Find critics, friends, and filmmakers whose taste you want in your feed."
                : `${displayName} isn’t following anyone yet.`
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
            className="h-full justify-center px-5"
            icon={
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken">
                <UsersRound className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden />
              </span>
            }
            headline={isOwnProfile ? "Your audience starts here" : "No followers yet"}
            subline={
              isOwnProfile
                ? "Share a film, review, or list worth following."
                : `${displayName} doesn’t have any followers yet.`
            }
          />
        )}
      </div>
    </Dialog>
  );
}
