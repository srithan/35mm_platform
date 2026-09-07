import type { FeedComment } from "@35mm/types";
import { AppText, Avatar, Counter, useMobileUI } from "@35mm/mobile-ui";
import { memo } from "react";
import { Image, StyleSheet, View } from "react-native";

import { RichTextBody } from "./RichTextBody";

export interface ThreadComment {
  readonly comment: FeedComment;
  readonly depth: 0 | 1 | 2;
}

export function flattenCommentTree(comments: readonly FeedComment[]): ThreadComment[] {
  let unique = new Map<string, FeedComment>();
  for (const item of comments) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  let children = new Map<string, FeedComment[]>();
  let roots: FeedComment[] = [];
  for (const item of unique.values()) {
    if (item.parentId && unique.has(item.parentId)) {
      let siblings = children.get(item.parentId) ?? [];
      siblings.push(item);
      children.set(item.parentId, siblings);
    } else {
      roots.push(item);
    }
  }

  let output: ThreadComment[] = [];
  let visited = new Set<string>();
  function append(comment: FeedComment, depth: 0 | 1 | 2) {
    if (visited.has(comment.id)) return;
    visited.add(comment.id);
    output.push({ comment, depth });
    let childDepth = Math.min(depth + 1, 2) as 0 | 1 | 2;
    for (let child of children.get(comment.id) ?? []) append(child, childDepth);
  }
  for (let root of roots) append(root, 0);
  for (let remaining of unique.values()) append(remaining, 0);
  return output;
}

function relativeTime(value: string): string {
  let elapsed = Math.max(0, Date.now() - Date.parse(value));
  let minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  let hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export const CommentRow = memo(function CommentRow({ item }: { readonly item: ThreadComment }) {
  const { theme } = useMobileUI();
  let comment = item.comment;
  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderLeftColor: item.depth > 0 ? theme.colors.borderStrong : "transparent",
          marginLeft: item.depth * 20,
        },
      ]}
      testID={`comment-${comment.id}`}
    >
      <Avatar
        avatarSize="small"
        label={`${comment.author.displayName} avatar`}
        {...(comment.author.avatarUrl ? { source: { uri: comment.author.avatarUrl } } : {})}
      />
      <View style={styles.copy}>
        <View style={styles.identity}>
          <AppText numberOfLines={1} role="rowLabelCompact">{comment.author.displayName}</AppText>
          <AppText color="textSecondary" numberOfLines={1} role="metadata">
            @{comment.author.username} · {relativeTime(comment.createdAt)}
          </AppText>
        </View>
        {comment.isDeleted ? (
          <AppText color="textSecondary">Comment deleted.</AppText>
        ) : comment.body ? (
          <RichTextBody value={comment.body} />
        ) : null}
        {!comment.isDeleted && comment.gifUrl ? (
          <Image
            accessibilityLabel={`${comment.author.displayName} comment GIF`}
            resizeMode="cover"
            source={{ uri: comment.gifUrl }}
            style={styles.gif}
          />
        ) : null}
        <Counter active={comment.isLiked === true} activeColor="like" icon="heart" label="Comment likes" value={comment.likeCount} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  copy: { flex: 1, gap: 7 },
  gif: { aspectRatio: 16 / 10, borderRadius: 8, maxWidth: 360, width: "100%" },
  identity: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap", gap: 4 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 2,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
