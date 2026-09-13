import { isApiClientError } from "@35mm/api-client";
import {
  ActionSheet,
  AppIcon,
  AppText,
  Avatar,
  Button,
  Chip,
  ConfirmationDialog,
  IconButton,
  LoadingState,
  ModalSurface,
  PaginationFooter,
  StateSurface,
  TextField,
  useMobileUI,
  type ActionSheetSection,
} from "@35mm/mobile-ui";
import { spacing } from "@35mm/design-tokens";
import type { FeedPage, FeedPost, FilmListSummary, ModerationReportReason } from "@35mm/types";
import { FlashList } from "@shopify/flash-list";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  View,
} from "react-native";

import type { CurrentUserBootstrapProfile } from "@/features/auth/bootstrap/api";
import { PostCard } from "@/features/feed/PostCard";
import { useApiClient } from "@/services/api";
import {
  blockProfile,
  fetchProfileFeedPage,
  fetchProfileListsPage,
  fetchProfileStats,
  fetchPublicProfile,
  followProfile,
  reportProfile,
  setProfileMuted,
  unfollowProfile,
} from "./api";
import type { ProfileStatsSummary, PublicProfile } from "./contracts";
import { profileKeys } from "./queryKeys";

type ProfileTab = "posts" | "reposts" | "diary" | "lists" | "stats";
type ProfileRow =
  | { readonly kind: "post"; readonly post: FeedPost }
  | { readonly kind: "diary"; readonly post: FeedPost }
  | { readonly kind: "list"; readonly list: FilmListSummary };

const TABS: readonly { readonly id: ProfileTab; readonly label: string; readonly icon: "compose" | "repost" | "calendar" | "folder" | "film" }[] = [
  { id: "posts", label: "Posts", icon: "compose" },
  { id: "reposts", label: "Reposts", icon: "repost" },
  { id: "diary", label: "Diary", icon: "calendar" },
  { id: "lists", label: "Lists", icon: "folder" },
  { id: "stats", label: "Stats", icon: "film" },
];

const REPORT_REASONS: readonly {
  readonly id: ModerationReportReason;
  readonly label: string;
}[] = [
  { id: "harassment", label: "Harassment" },
  { id: "hate_speech", label: "Hate speech" },
  { id: "impersonation", label: "Impersonation" },
  { id: "spam", label: "Spam" },
  { id: "misinformation", label: "Misinformation" },
  { id: "self_harm", label: "Self-harm" },
  { id: "other", label: "Other" },
];

function uniquePosts(pages: readonly FeedPage[]): FeedPost[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  }));
}

function uniqueLists(pages: readonly { readonly items: readonly FilmListSummary[] }[]): FilmListSummary[] {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items.filter((list) => {
    if (seen.has(list.id)) return false;
    seen.add(list.id);
    return true;
  }));
}

function byline(profile: PublicProfile | CurrentUserBootstrapProfile): string {
  const role = profile.role?.trim() || "Cinephile";
  const context = profile.roleContext?.trim();
  return context ? `${role} · ${context}` : role;
}

function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function profileUrl(username: string): string {
  return `https://35mm.in/${username}`;
}

function isOfflineError(error: unknown): boolean {
  return isApiClientError(error) && (error.kind === "network" || error.kind === "timeout");
}

function patchDetail(
  current: PublicProfile | undefined,
  patch: Partial<PublicProfile>,
): PublicProfile | undefined {
  return current ? { ...current, ...patch } : current;
}

function optimisticFollow(profile: PublicProfile): PublicProfile {
  if (profile.followState === "self") return profile;
  if (profile.followState === "following") {
    return {
      ...profile,
      followState: "none",
      followerCount: Math.max(0, profile.followerCount - 1),
    };
  }
  if (profile.followState === "requested") {
    return { ...profile, followState: "none" };
  }
  return {
    ...profile,
    followState: profile.isPrivate ? "requested" : "following",
    followerCount: profile.isPrivate ? profile.followerCount : profile.followerCount + 1,
  };
}

export function ProfileScreen({
  currentUser,
  initialProfile,
  username,
}: {
  readonly currentUser?: CurrentUserBootstrapProfile;
  readonly initialProfile?: CurrentUserBootstrapProfile;
  readonly username: string;
}) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { theme } = useMobileUI();
  const [tab, setTab] = useState<ProfileTab>("posts");
  const [actionsVisible, setActionsVisible] = useState(false);
  const [blockConfirmVisible, setBlockConfirmVisible] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ readonly title: string; readonly url: string } | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<ModerationReportReason>("harassment");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const normalizedUsername = username.trim().toLowerCase();

  const profileQuery = useQuery({
    queryKey: profileKeys.detail(normalizedUsername),
    queryFn: ({ signal }) => fetchPublicProfile(client, normalizedUsername, signal),
    initialData: initialProfile
      ? {
          userId: initialProfile.userId,
          username: initialProfile.username,
          displayName: initialProfile.displayName,
          bio: null,
          avatarUrl: initialProfile.avatarUrl,
          avatarUrlLg: initialProfile.avatarUrlLg,
          coverUrl: null,
          location: null,
          website: null,
          dateOfBirth: null,
          role: initialProfile.role,
          roleContext: initialProfile.roleContext,
          headline: initialProfile.role,
          headlineContext: initialProfile.roleContext,
          filmsLoggedCount: initialProfile.filmsLoggedCount,
          followerCount: initialProfile.followerCount,
          followingCount: initialProfile.followingCount,
          followState: "self",
          isPrivate: false,
          hasIncomingFollowRequest: false,
          hasPendingRequestToViewer: false,
          isMutedByViewer: false,
          isDeactivated: false,
          moderationStatus: "visible",
          createdAt: null,
        }
      : undefined,
    refetchOnMount: "always",
    staleTime: 60_000,
  });

  const postsQuery = useInfiniteQuery({
    queryKey: profileKeys.feed(normalizedUsername, "posts"),
    queryFn: ({ pageParam, signal }) =>
      fetchProfileFeedPage(client, {
        cursor: pageParam,
        kind: "posts",
        signal,
        username: normalizedUsername,
      }),
    enabled: tab === "posts" || tab === "diary",
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });

  const repostsQuery = useInfiniteQuery({
    queryKey: profileKeys.feed(normalizedUsername, "reposts"),
    queryFn: ({ pageParam, signal }) =>
      fetchProfileFeedPage(client, {
        cursor: pageParam,
        kind: "reposts",
        signal,
        username: normalizedUsername,
      }),
    enabled: tab === "reposts",
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });

  const listsQuery = useInfiniteQuery({
    queryKey: profileKeys.lists(normalizedUsername),
    queryFn: ({ pageParam, signal }) =>
      fetchProfileListsPage(client, {
        cursor: pageParam,
        signal,
        username: normalizedUsername,
      }),
    enabled: tab === "lists",
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.hasMore ? page.nextCursor : undefined,
  });

  const statsQuery = useQuery({
    queryKey: profileKeys.stats(normalizedUsername),
    queryFn: ({ signal }) => fetchProfileStats(client, normalizedUsername, signal),
    enabled: tab === "stats",
    staleTime: 60_000,
  });

  const profile = profileQuery.data;
  const isOwnProfile = profile?.followState === "self" || currentUser?.username === normalizedUsername;
  const posts = useMemo(() => uniquePosts(postsQuery.data?.pages ?? []), [postsQuery.data?.pages]);
  const reposts = useMemo(() => uniquePosts(repostsQuery.data?.pages ?? []), [repostsQuery.data?.pages]);
  const diaryPosts = useMemo(
    () => posts.filter((post) => post.type === "log" || post.type === "review"),
    [posts],
  );
  const lists = useMemo(() => uniqueLists(listsQuery.data?.pages ?? []), [listsQuery.data?.pages]);
  const rows = useMemo<readonly ProfileRow[]>(() => {
    if (tab === "posts") {
      return posts
        .filter((post) => !(post.visibility === "private" && !isOwnProfile))
        .map((post) => ({ kind: "post", post }));
    }
    if (tab === "reposts") return reposts.map((post) => ({ kind: "post", post }));
    if (tab === "diary") return diaryPosts.map((post) => ({ kind: "diary", post }));
    if (tab === "lists") return lists.map((list) => ({ kind: "list", list }));
    return [];
  }, [diaryPosts, isOwnProfile, lists, posts, reposts, tab]);

  const activeFeedQuery = tab === "reposts" ? repostsQuery : postsQuery;
  const activeListQuery = tab === "lists" ? listsQuery : null;
  const isPrivateGate = profile?.isPrivate && !isOwnProfile && profile.followState !== "following";

  const followMutation = useMutation({
    mutationFn: async (target: PublicProfile) => {
      if (target.followState === "following" || target.followState === "requested") {
        await unfollowProfile(client, target.userId);
        return { followState: "none" as const };
      }
      const result = await followProfile(client, target.userId);
      return { followState: result.status === "pending" ? "requested" as const : "following" as const };
    },
    onMutate: async (target) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.detail(normalizedUsername) });
      const previous = queryClient.getQueryData<PublicProfile>(profileKeys.detail(normalizedUsername));
      queryClient.setQueryData<PublicProfile>(
        profileKeys.detail(normalizedUsername),
        optimisticFollow(target),
      );
      return { previous };
    },
    onError: (_error, _target, context) => {
      if (context?.previous) {
        queryClient.setQueryData(profileKeys.detail(normalizedUsername), context.previous);
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData<PublicProfile>(profileKeys.detail(normalizedUsername), (current) =>
        patchDetail(current, { followState: result.followState }),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail(normalizedUsername) });
    },
  });

  const muteMutation = useMutation({
    mutationFn: async (target: PublicProfile) => {
      const muted = !target.isMutedByViewer;
      await setProfileMuted(client, target.userId, muted);
      return muted;
    },
    onSuccess: (muted) => {
      queryClient.setQueryData<PublicProfile>(profileKeys.detail(normalizedUsername), (current) =>
        patchDetail(current, { isMutedByViewer: muted }),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.detail(normalizedUsername) });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (target: PublicProfile) => {
      await blockProfile(client, target.userId);
    },
    onSuccess: () => {
      setBlockConfirmVisible(false);
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (input: {
      readonly userId: string;
      readonly reason: ModerationReportReason;
      readonly details: string | null;
    }) => reportProfile(client, input),
    onSuccess: () => {
      setReportSubmitted(true);
      setReportDetails("");
    },
  });

  const refresh = () => {
    void profileQuery.refetch();
    if (tab === "stats") void statsQuery.refetch();
    if (tab === "lists") void listsQuery.refetch();
    if (tab === "posts" || tab === "diary") void postsQuery.refetch();
    if (tab === "reposts") void repostsQuery.refetch();
  };

  const goToEdit = () => {
    router.push(`/profile/edit?username=${encodeURIComponent(normalizedUsername)}` as Href);
  };

  const openPost = (postId: string) => {
    router.push({ pathname: "/post/[postId]", params: { postId } });
  };

  const openConnections = (kind: "followers" | "following") => {
    router.push(`/profile/${encodeURIComponent(normalizedUsername)}/connections?kind=${kind}` as Href);
  };

  const shareProfile = useCallback(() => {
    if (!profile) return;
    void Share.share({
      message: profileUrl(profile.username),
      url: profileUrl(profile.username),
    });
  }, [profile]);

  const openReport = useCallback(() => {
    setReportSubmitted(false);
    setReportVisible(true);
  }, []);

  const submitReport = () => {
    if (!profile || reportMutation.isPending) return;
    reportMutation.mutate({
      userId: profile.userId,
      reason: reportReason,
      details: reportDetails.trim() || null,
    });
  };

  const actionSections = useMemo<readonly ActionSheetSection[]>(() => {
    if (!profile) return [];
    const primary: ActionSheetSection = {
      id: "profile-primary",
      actions: [
        {
          id: "share-profile",
          label: "Share profile",
          description: `Send @${profile.username} through another app`,
          icon: "share",
          onPress: shareProfile,
        },
      ],
    };
    if (isOwnProfile) return [primary];
    return [
      primary,
      {
        id: "profile-safety",
        actions: [
          {
            id: "mute-profile",
            label: profile.isMutedByViewer ? "Unmute profile" : "Mute profile",
            description: profile.isMutedByViewer ? "Show this profile in feeds again" : "Hide this profile from feeds",
            icon: "shield-alert",
            disabled: muteMutation.isPending,
            onPress: () => muteMutation.mutate(profile),
          },
          {
            id: "report-profile",
            label: "Report profile",
            description: "Send this account to moderation review",
            icon: "shield-alert",
            disabled: reportMutation.isPending,
            onPress: openReport,
          },
          {
            id: "block-profile",
            label: "Block profile",
            description: "Remove mutual follows and stop interactions",
            icon: "trash",
            destructive: true,
            disabled: blockMutation.isPending,
            onPress: () => setBlockConfirmVisible(true),
          },
        ],
      },
    ];
  }, [blockMutation.isPending, isOwnProfile, muteMutation, openReport, profile, reportMutation.isPending, shareProfile]);

  if (profileQuery.isPending && !profile) {
    return <LoadingState label="Loading profile" />;
  }

  if (profileQuery.isError || !profile) {
    const offline = isOfflineError(profileQuery.error);
    const blocked = isApiClientError(profileQuery.error) && profileQuery.error.code === "BLOCKED";
    return (
      <View style={styles.stateWrap}>
        <StateSurface
          kind={offline ? "offline" : blocked ? "permissionDenied" : "error"}
          title={blocked ? "Profile blocked" : "Couldn't load profile"}
          message={
            blocked
              ? "This account cannot be viewed from the current session."
              : "Refresh this profile without losing your place."
          }
          primaryAction={{ label: "Try again", onPress: () => void profileQuery.refetch() }}
        />
      </View>
    );
  }

  if (profile.isDeactivated) {
    return (
      <View style={styles.stateWrap}>
        <StateSurface
          kind="deleted"
          title="Deactivated account"
          message="This profile is no longer active."
        />
      </View>
    );
  }

  if (tab === "stats") {
    return (
      <FlashList
        data={[]}
        keyExtractor={(_, index) => `stats-${index}`}
        ListHeaderComponent={
          <>
            <ProfileHeader
              actionPending={followMutation.isPending}
              isOwnProfile={isOwnProfile}
              onEdit={goToEdit}
              onFollowers={() => openConnections("followers")}
              onFollowing={() => openConnections("following")}
              onFollow={() => followMutation.mutate(profile)}
              onMore={() => setActionsVisible(true)}
              onOpenAvatar={() => {
                const url = profile.avatarUrlLg ?? profile.avatarUrl;
                if (url) setMediaPreview({ title: `${profile.displayName} profile photo`, url });
              }}
              onOpenCover={() => {
                if (profile.coverUrl) setMediaPreview({ title: `${profile.displayName} cover photo`, url: profile.coverUrl });
              }}
              profile={profile}
            />
            <ProfileTabs activeTab={tab} onTabChange={setTab} />
            <ProfileStatsPanel query={statsQuery} />
          </>
        }
        refreshControl={
          <RefreshControl refreshing={profileQuery.isFetching || statsQuery.isFetching} onRefresh={refresh} tintColor={theme.colors.accent} />
        }
        renderItem={() => null}
      />
    );
  }

  return (
    <>
      <FlashList
        data={isPrivateGate ? [] : rows}
        keyExtractor={(item) => {
          if (item.kind === "list") return `list-${item.list.id}`;
          return `${item.kind}-${item.post.id}`;
        }}
        ListEmptyComponent={
          isPrivateGate ? (
            <View style={styles.stateWrap}>
              <StateSurface
                compact
                kind="private"
                title="This account is private"
                message={`Follow ${profile.displayName} to see their posts.`}
              />
            </View>
          ) : activeFeedQuery.isError || activeListQuery?.isError ? (
            <View style={styles.stateWrap}>
              <StateSurface
                compact
                kind={
                  isOfflineError(activeFeedQuery.error ?? activeListQuery?.error)
                    ? "offline"
                    : "error"
                }
                title="Couldn't load this tab"
                message="Try again when the connection settles."
                primaryAction={{ label: "Try again", onPress: refresh }}
              />
            </View>
          ) : activeFeedQuery.isPending || activeListQuery?.isPending ? (
            <LoadingState compact label="Loading profile tab" style={styles.tabLoading} />
          ) : (
            <View style={styles.stateWrap}>
              <StateSurface
                compact
                kind="empty"
                title={emptyTitle(tab, profile, isOwnProfile)}
                message={emptyMessage(tab, profile, isOwnProfile)}
                {...(isOwnProfile && tab === "posts"
                  ? { primaryAction: { label: "Create post", onPress: () => router.push("/") } }
                  : {})}
              />
            </View>
          )
        }
        ListFooterComponent={
          isPrivateGate ? null : (
            <PaginationFooter
              state={
                tab === "lists"
                  ? listsQuery.isFetchingNextPage
                    ? "loading"
                    : listsQuery.isFetchNextPageError
                      ? "error"
                      : listsQuery.hasNextPage
                        ? "idle"
                        : rows.length > 0
                          ? "complete"
                          : "idle"
                  : activeFeedQuery.isFetchingNextPage
                    ? "loading"
                    : activeFeedQuery.isFetchNextPageError
                      ? "error"
                      : activeFeedQuery.hasNextPage
                        ? "idle"
                        : rows.length > 0
                          ? "complete"
                          : "idle"
              }
              completeMessage="End of profile"
              retry={() => {
                if (tab === "lists") void listsQuery.fetchNextPage();
                else void activeFeedQuery.fetchNextPage();
              }}
            />
          )
        }
        ListHeaderComponent={
          <>
            <ProfileHeader
              actionPending={followMutation.isPending}
              isOwnProfile={isOwnProfile}
              onEdit={goToEdit}
              onFollowers={() => openConnections("followers")}
              onFollowing={() => openConnections("following")}
              onFollow={() => followMutation.mutate(profile)}
              onMore={() => setActionsVisible(true)}
              onOpenAvatar={() => {
                const url = profile.avatarUrlLg ?? profile.avatarUrl;
                if (url) setMediaPreview({ title: `${profile.displayName} profile photo`, url });
              }}
              onOpenCover={() => {
                if (profile.coverUrl) setMediaPreview({ title: `${profile.displayName} cover photo`, url: profile.coverUrl });
              }}
              profile={profile}
            />
            <ProfileTabs activeTab={tab} onTabChange={setTab} />
          </>
        }
        onEndReached={() => {
          if (isPrivateGate) return;
          if (tab === "lists" && listsQuery.hasNextPage && !listsQuery.isFetchingNextPage) {
            void listsQuery.fetchNextPage();
          }
          if ((tab === "posts" || tab === "diary" || tab === "reposts") &&
              activeFeedQuery.hasNextPage && !activeFeedQuery.isFetchingNextPage) {
            void activeFeedQuery.fetchNextPage();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={profileQuery.isFetching || activeFeedQuery.isRefetching || Boolean(activeListQuery?.isRefetching)}
            onRefresh={refresh}
            tintColor={theme.colors.accent}
          />
        }
        renderItem={({ item }) => {
          if (item.kind === "list") return <ProfileListRow list={item.list} />;
          if (item.kind === "diary") return <DiaryRow post={item.post} onOpen={() => openPost(item.post.id)} />;
          return (
            <PostCard
              active={false}
              autoplay={false}
              currentUserId={currentUser?.userId ?? ""}
              onOpenPost={() => openPost(item.post.id)}
              post={item.post}
              startWithSound={false}
            />
          );
        }}
        testID="profile-screen"
      />
      <ActionSheet
        accessibilityLabel="Profile actions"
        onRequestClose={() => setActionsVisible(false)}
        sections={actionSections}
        testID="profile-actions"
        visible={actionsVisible}
      />
      <MediaPreviewModal preview={mediaPreview} onClose={() => setMediaPreview(null)} />
      <ReportProfileModal
        details={reportDetails}
        error={reportMutation.isError}
        loading={reportMutation.isPending}
        onChangeDetails={setReportDetails}
        onChangeReason={setReportReason}
        onClose={() => setReportVisible(false)}
        onSubmit={submitReport}
        profile={profile}
        reason={reportReason}
        submitted={reportSubmitted}
        visible={reportVisible}
      />
      <ConfirmationDialog
        confirmLabel={`Block @${profile.username}`}
        destructive
        loading={blockMutation.isPending}
        message="They will no longer be able to interact with you. Existing follow relationships are removed server-side."
        onCancel={() => setBlockConfirmVisible(false)}
        onConfirm={() => blockMutation.mutate(profile)}
        title={`Block @${profile.username}?`}
        visible={blockConfirmVisible}
      />
      {followMutation.isError || muteMutation.isError || blockMutation.isError ? (
        <View style={[styles.actionError, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <AppText accessibilityLiveRegion="assertive" color="destructive" role="metadata">
            Profile action failed. Server state is being restored.
          </AppText>
        </View>
      ) : null}
    </>
  );
}

function ProfileHeader({
  actionPending,
  isOwnProfile,
  onEdit,
  onFollowers,
  onFollowing,
  onFollow,
  onMore,
  onOpenAvatar,
  onOpenCover,
  profile,
}: {
  readonly actionPending: boolean;
  readonly isOwnProfile: boolean;
  readonly onEdit: () => void;
  readonly onFollowers: () => void;
  readonly onFollowing: () => void;
  readonly onFollow: () => void;
  readonly onMore: () => void;
  readonly onOpenAvatar: () => void;
  readonly onOpenCover: () => void;
  readonly profile: PublicProfile;
}) {
  const { theme } = useMobileUI();
  return (
    <View>
      <Pressable
        accessibilityRole={profile.coverUrl ? "imagebutton" : "image"}
        accessibilityLabel={profile.coverUrl ? `${profile.displayName} cover photo` : "No cover photo"}
        disabled={!profile.coverUrl}
        onPress={onOpenCover}
        style={[styles.cover, { backgroundColor: theme.colors.surfaceSunken }]}
      >
        {profile.coverUrl ? (
          <Image source={{ uri: profile.coverUrl }} resizeMode="cover" style={styles.coverImage} />
        ) : null}
      </Pressable>
      <View style={styles.headerBody}>
        <View style={styles.avatarRow}>
          <Pressable
            accessibilityRole={(profile.avatarUrlLg ?? profile.avatarUrl) ? "imagebutton" : "image"}
            accessibilityLabel={`${profile.displayName} avatar`}
            disabled={!(profile.avatarUrlLg ?? profile.avatarUrl)}
            onPress={onOpenAvatar}
          >
            <Avatar
              avatarSize={92}
              label={`${profile.displayName} avatar`}
              style={[styles.profileAvatar, { borderColor: theme.colors.surface }]}
              {...(profile.avatarUrlLg ?? profile.avatarUrl ? { source: { uri: profile.avatarUrlLg ?? profile.avatarUrl ?? "" } } : {})}
            />
          </Pressable>
          <View style={styles.headerActions}>
            <IconButton icon="share" label="Share profile" onPress={() => void Share.share({ message: profileUrl(profile.username), url: profileUrl(profile.username) })} style={styles.circleAction} />
            <IconButton icon="more" label="More profile actions" onPress={onMore} style={styles.circleAction} />
          </View>
        </View>
        <View style={styles.identity}>
          <AppText accessibilityRole="header" role="screenTitle">{profile.displayName}</AppText>
          <AppText color="textSecondary">@{profile.username}</AppText>
          <Chip label={byline(profile)} selected style={styles.bylineChip} />
          {profile.bio ? <AppText style={styles.bio}>{profile.bio}</AppText> : null}
          <View style={styles.metadata}>
            {profile.location ? (
              <View style={styles.metaItem}>
                <AppIcon name="globe" size="extraSmall" color={theme.colors.textSecondary} />
                <AppText color="textSecondary" role="metadata">{profile.location}</AppText>
              </View>
            ) : null}
            {profile.website ? (
              <View style={styles.metaItem}>
                <AppIcon name="globe" size="extraSmall" color={theme.colors.accent} />
                <AppText color="accent" numberOfLines={1} role="metadata">{profile.website.replace(/^https?:\/\//i, "")}</AppText>
              </View>
            ) : null}
          </View>
          <View style={styles.counts}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${profile.filmsLoggedCount} films logged`} style={styles.countCell}>
              <AppText role="counter">{formatCount(profile.filmsLoggedCount)}</AppText>
              <AppText color="textSecondary" role="metadata">Films</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${profile.followerCount} followers`} onPress={onFollowers} style={styles.countCell}>
              <AppText role="counter">{formatCount(profile.followerCount)}</AppText>
              <AppText color="textSecondary" role="metadata">Followers</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${profile.followingCount} following`} onPress={onFollowing} style={styles.countCell}>
              <AppText role="counter">{formatCount(profile.followingCount)}</AppText>
              <AppText color="textSecondary" role="metadata">Following</AppText>
            </Pressable>
          </View>
          <Button
            fullWidth
            icon={isOwnProfile ? "compose" : "user"}
            label={isOwnProfile ? "Edit profile" : followLabel(profile)}
            loading={actionPending}
            onPress={isOwnProfile ? onEdit : onFollow}
            variant={isOwnProfile || profile.followState === "following" || profile.followState === "requested" ? "secondary" : "primary"}
          />
          {profile.hasIncomingFollowRequest && !isOwnProfile ? (
            <AppText color="textSecondary" role="metadata">
              @{profile.username} requested to follow you.
            </AppText>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function followLabel(profile: PublicProfile): string {
  if (profile.followState === "following") return "Following";
  if (profile.followState === "requested") return "Requested";
  return profile.isPrivate ? "Request" : "Follow";
}

function ProfileTabs({
  activeTab,
  onTabChange,
}: {
  readonly activeTab: ProfileTab;
  readonly onTabChange: (tab: ProfileTab) => void;
}) {
  const { theme } = useMobileUI();
  const activeIndex = Math.max(0, TABS.findIndex((tab) => tab.id === activeTab));
  return (
    <View style={[styles.tabs, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
      <View style={styles.tabRow}>
        {TABS.map((item) => {
          const selected = item.id === activeTab;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item.id}
              onPress={() => onTabChange(item.id)}
              style={({ pressed }) => [
                styles.tab,
                { backgroundColor: pressed ? theme.colors.surfacePressed : "transparent" },
              ]}
              testID={`profile-tab-${item.id}`}
            >
              <AppIcon
                name={item.icon}
                color={selected ? theme.colors.text : theme.colors.textTertiary}
                size="small"
              />
              {selected ? (
                <AppText numberOfLines={1} role="metadata" style={styles.selectedTabLabel}>
                  {item.label}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View pointerEvents="none" style={styles.indicatorTrack}>
        <View style={[styles.indicatorSlot, { marginLeft: `${activeIndex * 20}%` }]}>
          <View style={[styles.indicator, { backgroundColor: theme.colors.text }]} />
        </View>
      </View>
    </View>
  );
}

function DiaryRow({
  onOpen,
  post,
}: {
  readonly onOpen: () => void;
  readonly post: FeedPost;
}) {
  const { theme } = useMobileUI();
  return (
    <Pressable
      accessibilityLabel={`Open diary entry ${post.film?.title ?? post.headline ?? "post"}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.diaryRow,
        { backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surface },
      ]}
    >
      <View style={[styles.diaryDate, { backgroundColor: theme.colors.surfaceSunken }]}>
        <AppText align="center" color="textSecondary" role="metadata">
          {new Date(post.createdAt).toLocaleDateString(undefined, { month: "short" })}
        </AppText>
        <AppText align="center" role="counter">
          {new Date(post.createdAt).getDate()}
        </AppText>
      </View>
      <View style={styles.diaryCopy}>
        <AppText role="rowLabelCompact">{post.film?.title ?? post.headline ?? "Untitled entry"}</AppText>
        <AppText color="textSecondary" numberOfLines={2} role="metadata">
          {[post.film?.year, post.type === "review" ? "Review" : "Log"].filter(Boolean).join(" · ")}
        </AppText>
      </View>
      {post.film?.posterUrl ? (
        <Image accessibilityLabel={`${post.film.title} poster`} source={{ uri: post.film.posterUrl }} style={styles.diaryPoster} />
      ) : null}
    </Pressable>
  );
}

function ProfileListRow({ list }: { readonly list: FilmListSummary }) {
  const { theme } = useMobileUI();
  return (
    <View style={[styles.listRow, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.posterStack}>
        {list.posterUrls.slice(0, 3).map((url, index) => (
          <View
            key={`${list.id}-${index}`}
            style={[
              styles.listPoster,
              { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.surface, left: index * 20 },
            ]}
          >
            {url ? <Image source={{ uri: url }} style={styles.listPosterImage} /> : null}
          </View>
        ))}
      </View>
      <View style={styles.listCopy}>
        <AppText role="rowLabelCompact">{list.title}</AppText>
        {list.description ? (
          <AppText color="textSecondary" numberOfLines={2} role="metadata">{list.description}</AppText>
        ) : null}
        <AppText color="textSecondary" role="metadata">
          {list.entryCount} films · {list.likeCount} likes
        </AppText>
      </View>
    </View>
  );
}

function MediaPreviewModal({
  onClose,
  preview,
}: {
  readonly onClose: () => void;
  readonly preview: { readonly title: string; readonly url: string } | null;
}) {
  const { theme } = useMobileUI();
  return (
    <ModalSurface
      accessibilityLabel={preview?.title ?? "Profile image preview"}
      closeButtonLabel="Close image preview"
      onRequestClose={onClose}
      showCloseButton
      testID="profile-media-preview"
      variant="fullScreen"
      visible={Boolean(preview)}
      style={[styles.previewModal, { backgroundColor: theme.colors.surface }]}
    >
      {preview ? (
        <View style={styles.previewBody}>
          <Image
            accessibilityLabel={preview.title}
            resizeMode="contain"
            source={{ uri: preview.url }}
            style={styles.previewImage}
          />
        </View>
      ) : null}
    </ModalSurface>
  );
}

function ReportProfileModal({
  details,
  error,
  loading,
  onChangeDetails,
  onChangeReason,
  onClose,
  onSubmit,
  profile,
  reason,
  submitted,
  visible,
}: {
  readonly details: string;
  readonly error: boolean;
  readonly loading: boolean;
  readonly onChangeDetails: (value: string) => void;
  readonly onChangeReason: (value: ModerationReportReason) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
  readonly profile: PublicProfile;
  readonly reason: ModerationReportReason;
  readonly submitted: boolean;
  readonly visible: boolean;
}) {
  return (
    <ModalSurface
      accessibilityLabel={`Report @${profile.username}`}
      onRequestClose={onClose}
      showCloseButton
      testID="profile-report-modal"
      visible={visible}
    >
      <View style={styles.reportModal}>
        <View style={styles.reportHeader}>
          <AppText accessibilityRole="header" role="sectionTitle">Report @{profile.username}</AppText>
          <AppText color="textSecondary" role="metadata">
            Reports go to moderation with this profile snapshot.
          </AppText>
        </View>
        {submitted ? (
          <StateSurface
            compact
            icon="shield-alert"
            kind="empty"
            title="Report received"
            message="Moderation will review it."
            primaryAction={{ label: "Done", onPress: onClose }}
          />
        ) : (
          <>
            <View accessibilityLabel="Report reason" accessibilityRole="radiogroup" style={styles.reportReasons}>
              {REPORT_REASONS.map((item) => (
                <Chip
                  accessibilityRole="radio"
                  key={item.id}
                  label={item.label}
                  onPress={() => onChangeReason(item.id)}
                  selected={reason === item.id}
                />
              ))}
            </View>
            <TextField
              label="Details"
              maxLength={2000}
              message={`${details.length}/2000`}
              multiline
              onChangeText={onChangeDetails}
              placeholder="Add context for moderators"
              style={styles.reportDetails}
              textAlignVertical="top"
              value={details}
            />
            {error ? (
              <AppText accessibilityLiveRegion="assertive" color="destructive" role="metadata">
                Report failed. Try again.
              </AppText>
            ) : null}
            <View style={styles.reportActions}>
              <Button
                disabled={loading}
                label="Cancel"
                onPress={onClose}
                size="compact"
                variant="secondary"
              />
              <Button
                icon="shield-alert"
                label="Submit report"
                loading={loading}
                onPress={onSubmit}
                size="compact"
              />
            </View>
          </>
        )}
      </View>
    </ModalSurface>
  );
}

function ProfileStatsPanel({
  query,
}: {
  readonly query: UseQueryResult<ProfileStatsSummary, Error>;
}) {
  const { theme } = useMobileUI();
  if (query.isPending) {
    return <LoadingState compact label="Loading profile stats" style={styles.tabLoading} />;
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.stateWrap}>
        <StateSurface
          compact
          kind={isOfflineError(query.error) ? "offline" : "error"}
          title="Couldn't load stats"
          primaryAction={{ label: "Try again", onPress: () => void query.refetch() }}
        />
      </View>
    );
  }
  const stats = query.data;
  return (
    <View style={styles.statsPanel}>
      <View style={styles.statGrid}>
        <StatCard label="Films" value={stats.filmsLoggedCount} subline={`${stats.uniqueFilmsCount} unique`} />
        <StatCard label="Hours" value={Math.round(stats.hoursWatched)} subline={`${stats.runtimeKnownCount} runtimes`} />
        <StatCard label="Rating" value={stats.averageRating === null ? "N/A" : stats.averageRating.toFixed(1)} subline={`${stats.ratedCount} rated`} />
        <StatCard label="Reviews" value={stats.reviewsWrittenCount} subline={`${stats.reviewLikeCount} likes`} />
      </View>
      {stats.favoriteFilms.length > 0 ? (
        <View style={styles.statsSection}>
          <AppText role="sectionTitle">Favorite films</AppText>
          <View style={styles.favoritesRow}>
            {stats.favoriteFilms.slice(0, 4).map((film) => (
              <View key={film.id} style={styles.favoriteFilm}>
                <View style={[styles.favoritePoster, { backgroundColor: theme.colors.surfaceSunken }]}>
                  {film.posterUrl ? <Image source={{ uri: film.posterUrl }} style={styles.favoritePosterImage} /> : null}
                </View>
                <AppText numberOfLines={2} role="metadata">{film.title}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {stats.genres.length > 0 ? (
        <View style={styles.statsSection}>
          <AppText role="sectionTitle">Genres</AppText>
          {stats.genres.slice(0, 5).map((genre) => (
            <View key={genre.name} style={styles.genreRow}>
              <AppText role="metadata">{genre.name}</AppText>
              <AppText color="textSecondary" role="counter">{genre.count}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatCard({
  label,
  subline,
  value,
}: {
  readonly label: string;
  readonly subline: string;
  readonly value: number | string;
}) {
  const { theme } = useMobileUI();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surfaceSunken }]}>
      <AppText role="screenTitle">{typeof value === "number" ? formatCount(value) : value}</AppText>
      <AppText role="rowLabelCompact">{label}</AppText>
      <AppText color="textSecondary" role="metadata">{subline}</AppText>
    </View>
  );
}

function emptyTitle(tab: ProfileTab, profile: PublicProfile, isOwnProfile: boolean): string {
  if (tab === "posts") return isOwnProfile ? "You haven't posted yet" : `${profile.displayName} hasn't posted yet`;
  if (tab === "reposts") return isOwnProfile ? "Nothing reposted yet" : "No reposts yet";
  if (tab === "diary") return isOwnProfile ? "Your diary is empty" : "No diary entries yet";
  if (tab === "lists") return isOwnProfile ? "No lists yet" : "No public lists yet";
  return "Nothing here yet";
}

function emptyMessage(tab: ProfileTab, profile: PublicProfile, isOwnProfile: boolean): string {
  if (tab === "posts" && isOwnProfile) return "Write your first post when the take is ready.";
  if (tab === "reposts") return isOwnProfile ? "Shared posts collect here." : `${profile.displayName} has not shared any posts yet.`;
  if (tab === "diary") return isOwnProfile ? "Logs and reviews collect here." : `${profile.displayName} has no public diary entries.`;
  if (tab === "lists") return isOwnProfile ? "Build lists from films you love." : `${profile.displayName} has no public lists.`;
  return "Check back after more activity.";
}

export type ProfileFeedData = InfiniteData<FeedPage, string | null>;

export const profileTestInternals = {
  formatCount,
  optimisticFollow,
};

const styles = StyleSheet.create({
  actionError: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 76,
    left: spacing.screenHorizontal,
    padding: 12,
    position: "absolute",
    right: spacing.screenHorizontal,
  },
  avatarRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -46,
  },
  bio: {
    fontSize: 15,
    lineHeight: 21,
  },
  bylineChip: {
    minHeight: 34,
  },
  circleAction: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  countCell: {
    flex: 1,
    gap: 2,
    minHeight: 46,
  },
  counts: {
    flexDirection: "row",
    gap: 12,
  },
  cover: {
    height: 148,
    overflow: "hidden",
  },
  coverImage: {
    height: "100%",
    width: "100%",
  },
  diaryCopy: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  diaryDate: {
    borderRadius: 12,
    gap: 2,
    justifyContent: "center",
    minHeight: 58,
    width: 58,
  },
  diaryPoster: {
    borderRadius: 7,
    height: 64,
    width: 43,
  },
  diaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 86,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  favoriteFilm: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  favoritePoster: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  favoritePosterImage: {
    height: "100%",
    width: "100%",
  },
  favoritesRow: {
    flexDirection: "row",
    gap: 8,
  },
  genreRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 34,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 54,
  },
  headerBody: {
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  identity: {
    gap: 9,
    paddingTop: 8,
  },
  indicator: {
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
    height: 3,
    marginHorizontal: 8,
  },
  indicatorSlot: {
    width: "20%",
  },
  indicatorTrack: {
    height: 3,
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listPoster: {
    borderRadius: 8,
    borderWidth: 2,
    height: 66,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    width: 44,
  },
  listPosterImage: {
    height: "100%",
    width: "100%",
  },
  listRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    minHeight: 92,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 5,
  },
  metadata: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  posterStack: {
    height: 66,
    width: 88,
  },
  previewBody: {
    flex: 1,
    justifyContent: "center",
  },
  previewImage: {
    height: "100%",
    width: "100%",
  },
  previewModal: {
    borderWidth: 0,
  },
  profileAvatar: {
    borderWidth: 4,
  },
  reportActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  reportDetails: {
    minHeight: 112,
  },
  reportHeader: {
    gap: 4,
  },
  reportModal: {
    gap: 16,
  },
  reportReasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTabLabel: {
    maxWidth: 78,
  },
  stateWrap: {
    padding: 20,
  },
  statCard: {
    borderRadius: 10,
    flex: 1,
    gap: 3,
    minHeight: 108,
    minWidth: "47%",
    padding: 14,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statsPanel: {
    gap: 20,
    padding: 16,
  },
  statsSection: {
    gap: 12,
  },
  tab: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 0,
  },
  tabLoading: {
    paddingVertical: 28,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  tabs: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
