import type { FeedPost } from "@35mm/types";
import {
  ActionSheet,
  AppText,
  Avatar,
  ConfirmationDialog,
  Counter,
  Divider,
  IconButton,
  useMobileUI,
  type ActionSheetSection,
} from "@35mm/mobile-ui";
import { memo, useCallback, useMemo, useState, type PropsWithChildren } from "react";
import {
  Image,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";

import { BunnyVideoPlayer } from "@/features/videos/BunnyVideoPlayer";
import { usePostInteractions } from "@/features/videos/usePostInteractions";
import { RichTextBody } from "./RichTextBody";

function relativeTime(value: string): string {
  let elapsed = Math.max(0, Date.now() - Date.parse(value));
  let minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  let hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function sharePost(post: FeedPost): Promise<void> {
  let url = `https://35mm.in/${post.author.username}/post/${post.id}`;
  return Share.share({ message: url, url }).then(() => undefined);
}

function PostCardSurface({
  children,
  onOpenPost,
  testID,
}: PropsWithChildren<{
  readonly onOpenPost: (() => void) | undefined;
  readonly testID: string;
}>) {
  if (!onOpenPost) {
    return <View style={styles.card} testID={testID}>{children}</View>;
  }

  return (
    <Pressable
      accessible={false}
      onPress={onOpenPost}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}

export function buildPostActionSections({
  bookmarkPending,
  deletePending,
  isBookmarked,
  isOwner,
  onBookmark,
  onDelete,
  onShare,
}: {
  readonly bookmarkPending: boolean;
  readonly deletePending: boolean;
  readonly isBookmarked: boolean;
  readonly isOwner: boolean;
  readonly onBookmark: () => void;
  readonly onDelete: () => void;
  readonly onShare: () => void;
}): readonly ActionSheetSection[] {
  let primary: ActionSheetSection = {
    id: "post-primary",
    actions: [
      {
        id: "share-post",
        label: "Share post",
        description: "Send this post through another app",
        icon: "share",
        onPress: onShare,
      },
      {
        id: "bookmark-post",
        label: isBookmarked ? "Remove bookmark" : "Bookmark post",
        description: isBookmarked ? "Remove this post from bookmarks" : "Save this post for later",
        icon: "bookmark",
        disabled: bookmarkPending,
        onPress: onBookmark,
      },
    ],
  };
  if (!isOwner) return [primary];
  return [
    primary,
    {
      id: "post-owner",
      actions: [{
        id: "delete-post",
        label: "Delete post",
        description: "Remove this post from profiles and feeds",
        icon: "trash",
        destructive: true,
        disabled: deletePending,
        onPress: onDelete,
      }],
    },
  ];
}

function PostAttachments({
  active,
  autoplay,
  post,
  startWithSound,
}: {
  readonly active: boolean;
  readonly autoplay: boolean;
  readonly post: FeedPost;
  readonly startWithSound: boolean;
}) {
  let video = post.media.find((item) => item.type === "video" && item.videoAssetId);
  let images = post.media.filter((item) => item.type === "image").slice(0, 4);
  let ratio = video?.width && video.height ? video.width / video.height : undefined;

  return (
    <>
      {images.length > 0 ? (
        <View style={styles.imageGrid}>
          {images.map((item, index) => (
            <Image
              accessibilityLabel={item.altText ?? `${post.author.displayName} post image ${index + 1}`}
              key={`${item.url}-${index}`}
              resizeMode="cover"
              source={{ uri: item.variants?.feed ?? item.thumbnailUrl ?? item.url }}
              style={[styles.image, images.length === 1 && styles.singleImage]}
            />
          ))}
        </View>
      ) : null}
      {video?.videoAssetId ? (
        <BunnyVideoPlayer
          active={active}
          assetId={video.videoAssetId}
          autoplay={autoplay}
          startWithSound={startWithSound}
          {...(ratio ? { initialAspectRatio: ratio } : {})}
          title={`${post.author.displayName} video`}
        />
      ) : null}
    </>
  );
}

function FilmAttachment({ post }: { readonly post: FeedPost }) {
  const { theme } = useMobileUI();
  let film = post.film;
  if (!film) return null;
  return (
    <View style={[styles.filmCard, { backgroundColor: theme.colors.surfaceSunken }]}>
      {film.posterUrl ? (
        <Image
          accessibilityLabel={`${film.title} poster`}
          source={{ uri: film.posterUrl }}
          style={styles.poster}
        />
      ) : null}
      <View style={styles.filmCopy}>
        <AppText role="rowLabelCompact">{film.title}</AppText>
        <AppText color="textSecondary" role="metadata">
          {[film.year, film.genres.slice(0, 2).join(" · ")].filter(Boolean).join(" · ")}
        </AppText>
        {film.rating !== null ? (
          <AppText color="accent" role="metadata">Rating: {film.rating}/5</AppText>
        ) : null}
      </View>
    </View>
  );
}

function PollAttachment({ post }: { readonly post: FeedPost }) {
  const { theme } = useMobileUI();
  if (!post.poll) return null;
  return (
    <View accessibilityLabel={`Poll with ${post.poll.totalVotes} votes`} style={styles.poll}>
      {post.poll.options.map((option) => (
        <View key={option.id} style={[styles.pollOption, { backgroundColor: theme.colors.surfaceSunken }]}>
          {option.imageUrl ? (
            <Image
              accessibilityLabel={option.label ?? "Poll option image"}
              source={{ uri: option.imageUrl }}
              style={styles.pollImage}
            />
          ) : null}
          <AppText numberOfLines={2} role="metadata" style={styles.pollLabel}>
            {option.label ?? "Image option"}
          </AppText>
          {option.percent !== null ? (
            <AppText color="textSecondary" role="counter">{option.percent}%</AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function RepostProof({ post }: { readonly post: FeedPost }) {
  let context = post.repostContext;
  if (!context) return null;
  let extraCount = Math.max(0, context.totalCount - context.users.length);
  let names = context.users.slice(0, 2).map((user) => user.displayName).join(", ");
  return (
    <AppText color="textSecondary" numberOfLines={1} role="metadata">
      Reposted by {names || context.user.displayName}{extraCount > 0 ? ` +${extraCount}` : ""}
    </AppText>
  );
}

function QuoteAttachment({ post }: { readonly post: FeedPost }) {
  const { theme } = useMobileUI();
  if (post.quotedPostUnavailable) {
    return (
      <View style={[styles.quote, { borderColor: theme.colors.border }]}>
        <AppText color="textSecondary" role="metadata">Quoted post unavailable.</AppText>
      </View>
    );
  }
  if (!post.quotedPost) return null;
  return (
    <View style={[styles.quote, { borderColor: theme.colors.border }]}>
      <AppText role="rowLabelCompact">
        {post.quotedPost.author.displayName} @{post.quotedPost.author.username}
      </AppText>
      {post.quotedPost.headline ? (
        <RichTextBody role="sectionTitle" value={post.quotedPost.headline} />
      ) : null}
      {post.quotedPost.body ? <RichTextBody value={post.quotedPost.body} /> : null}
    </View>
  );
}

export const PostCard = memo(function PostCard({
  post,
  active,
  currentUserId,
  autoplay,
  startWithSound,
  onOpenPost,
  onDeleted,
}: {
  readonly post: FeedPost;
  readonly active: boolean;
  readonly currentUserId: string;
  readonly autoplay: boolean;
  readonly startWithSound: boolean;
  readonly onOpenPost?: () => void;
  readonly onDeleted?: () => void;
}) {
  const { theme } = useMobileUI();
  const actions = usePostInteractions(post);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [externalActionError, setExternalActionError] = useState(false);
  const isOwner = post.author.id === currentUserId;
  const actionError = actions.like.error ?? actions.repost.error ?? actions.bookmark.error ?? actions.remove.error;
  const runShare = useCallback(() => {
    setExternalActionError(false);
    void sharePost(post).catch(() => setExternalActionError(true));
  }, [post]);
  const sections = useMemo<readonly ActionSheetSection[]>(() => {
    return buildPostActionSections({
      bookmarkPending: actions.bookmark.isPending,
      deletePending: actions.remove.isPending,
      isBookmarked: post.isBookmarked,
      isOwner,
      onBookmark: () => actions.bookmark.mutate(),
      onDelete: () => setConfirmDelete(true),
      onShare: runShare,
    });
  }, [actions.bookmark, actions.remove.isPending, isOwner, post.isBookmarked, runShare]);

  if (post.isDeleted) {
    return (
      <View style={styles.card} testID={`post-card-${post.id}`}>
        <AppText color="textSecondary">This post was deleted.</AppText>
        <Divider style={{ marginHorizontal: -16 }} />
      </View>
    );
  }

  return (
    <PostCardSurface onOpenPost={onOpenPost} testID={`post-card-${post.id}`}>
      <RepostProof post={post} />
      <View style={styles.identity}>
        <Avatar
          avatarSize="medium"
          label={`${post.author.displayName} avatar`}
          {...(post.author.avatarUrl ? { source: { uri: post.author.avatarUrl } } : {})}
        />
        <View style={styles.authorCopy}>
          <AppText numberOfLines={1} role="rowLabelCompact">{post.author.displayName}</AppText>
          <AppText color="textSecondary" numberOfLines={1} role="metadata">
            @{post.author.username} · {relativeTime(post.createdAt)}
          </AppText>
        </View>
        <IconButton icon="more" label="More post actions" onPress={() => setActionsVisible(true)} />
      </View>
      {post.type === "discussion" ? (
        <AppText color="textSecondary" role="metadata">DISCUSSION</AppText>
      ) : null}
      {post.headline ? <RichTextBody role="sectionTitle" value={post.headline} /> : null}
      {post.body ? <RichTextBody style={styles.body} value={post.body} /> : null}
      <FilmAttachment post={post} />
      <PostAttachments
        active={active}
        autoplay={autoplay}
        post={post}
        startWithSound={startWithSound}
      />
      {post.linkPreview ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${post.linkPreview.title}`}
          onPress={() => {
            setExternalActionError(false);
            void Linking.openURL(post.linkPreview!.url).catch(() => setExternalActionError(true));
          }}
          style={({ pressed }) => [
            styles.linkPreview,
            { backgroundColor: pressed ? theme.colors.surfacePressed : theme.colors.surfaceSunken },
          ]}
        >
          <AppText role="rowLabelCompact">{post.linkPreview.title}</AppText>
          {post.linkPreview.description ? (
            <AppText color="textSecondary" numberOfLines={2} role="metadata">
              {post.linkPreview.description}
            </AppText>
          ) : null}
          <AppText color="textSecondary" role="metadata">{post.linkPreview.domain}</AppText>
        </Pressable>
      ) : null}
      <PollAttachment post={post} />
      <QuoteAttachment post={post} />
      <View style={styles.actions}>
        <View style={styles.actionGroup}>
          <IconButton
            disabled={actions.like.isPending}
            icon="heart"
            label={post.isLiked ? "Unlike post" : "Like post"}
            onPress={() => actions.like.mutate()}
            selected={post.isLiked}
          />
          <Counter active={post.isLiked} label="Likes" value={post.likeCount} />
        </View>
        <View style={styles.actionGroup}>
          {onOpenPost ? (
            <>
              <IconButton icon="message" label="Open comments" onPress={onOpenPost} />
              <Counter label="Comments" value={post.commentCount} />
            </>
          ) : (
            <Counter icon="message" label="Comments" value={post.commentCount} />
          )}
        </View>
        <View style={styles.actionGroup}>
          <IconButton
            disabled={actions.repost.isPending}
            icon="repost"
            label={post.isReposted ? "Undo repost" : "Repost"}
            onPress={() => actions.repost.mutate()}
            selected={post.isReposted}
          />
          <Counter active={post.isReposted} label="Reposts" value={post.repostCount} />
        </View>
        <View style={styles.actionGroup}>
          <IconButton
            disabled={actions.bookmark.isPending}
            icon="bookmark"
            label={post.isBookmarked ? "Remove bookmark" : "Bookmark post"}
            onPress={() => actions.bookmark.mutate()}
            selected={post.isBookmarked}
          />
          <Counter active={post.isBookmarked} label="Bookmarks" value={post.bookmarkCount} />
        </View>
      </View>
      {actionError || externalActionError ? (
        <AppText accessibilityLiveRegion="assertive" color="destructive" role="metadata">
          {externalActionError ? "Couldn’t open that action." : "Action failed. Your feed has been restored."}
        </AppText>
      ) : null}
      <Divider style={{ marginHorizontal: -16, backgroundColor: theme.colors.border }} />
      <ActionSheet
        accessibilityLabel="Post actions"
        onRequestClose={() => setActionsVisible(false)}
        sections={sections}
        testID={`post-actions-${post.id}`}
        visible={actionsVisible}
      />
      <ConfirmationDialog
        confirmLabel="Delete post"
        destructive
        loading={actions.remove.isPending}
        message="This post will stop being available in profiles and feeds."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => actions.remove.mutate(undefined, {
          onSuccess: () => {
            setConfirmDelete(false);
            onDeleted?.();
          },
        })}
        title="Delete this post?"
        visible={confirmDelete}
      />
    </PostCardSurface>
  );
});

const styles = StyleSheet.create({
  actionGroup: { alignItems: "center", flexDirection: "row", flexShrink: 1 },
  actions: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  authorCopy: { flex: 1 },
  body: { fontSize: 15, lineHeight: 21 },
  card: { gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  cardPressed: { opacity: 0.92 },
  filmCard: { borderRadius: 10, flexDirection: "row", gap: 12, overflow: "hidden", padding: 10 },
  filmCopy: { flex: 1, gap: 3, justifyContent: "center" },
  identity: { alignItems: "center", flexDirection: "row", gap: 10 },
  image: { aspectRatio: 1, flexBasis: "48%", flexGrow: 1, minWidth: "48%" },
  imageGrid: { borderRadius: 10, flexDirection: "row", flexWrap: "wrap", gap: 2, overflow: "hidden" },
  linkPreview: { borderRadius: 10, gap: 4, minHeight: 72, padding: 12 },
  poll: { gap: 8 },
  pollImage: { borderRadius: 8, height: 52, width: 72 },
  pollLabel: { flex: 1 },
  pollOption: { alignItems: "center", borderRadius: 20, flexDirection: "row", justifyContent: "space-between", minHeight: 44, paddingHorizontal: 14 },
  poster: { borderRadius: 6, height: 84, width: 56 },
  quote: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, gap: 6, padding: 12 },
  singleImage: { aspectRatio: 16 / 10, flexBasis: "100%", minWidth: "100%" },
});
