import type { FeedComment, FeedPost } from "@35mm/types";

import { parseFeedPage } from "@/features/videos/contracts";

export interface CommentPage {
  readonly items: readonly FeedComment[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

function record(value: unknown, contract: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${contract} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) return null;
  return string(value, field);
}

function count(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
  return value as number;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be a boolean.`);
  return value;
}

export function parseFeedPost(value: unknown): FeedPost {
  let page = parseFeedPage({ items: [value], nextCursor: null, hasMore: false });
  let post = page.items[0];
  if (!post) throw new Error("FeedPost is missing.");
  return post;
}

function parseFeedComment(value: unknown, index: number): FeedComment {
  let source = record(value, `CommentPage.items[${index}]`);
  let author = record(source.author, `CommentPage.items[${index}].author`);
  let nsfw = record(source.nsfw, `CommentPage.items[${index}].nsfw`);
  let moderationStatus = source.moderationStatus;
  if (!["visible", "hidden", "removed"].includes(String(moderationStatus))) {
    throw new Error(`CommentPage.items[${index}].moderationStatus is invalid.`);
  }
  let nsfwStatus = nsfw.status;
  if (!["none", "pending", "flagged"].includes(String(nsfwStatus))) {
    throw new Error(`CommentPage.items[${index}].nsfw.status is invalid.`);
  }
  if (!Array.isArray(nsfw.categories)) {
    throw new Error(`CommentPage.items[${index}].nsfw.categories must be an array.`);
  }
  let categories = nsfw.categories.map((category) => {
    if (!["nudity", "sexual_content", "violence", "graphic_content", "sensitive"].includes(String(category))) {
      throw new Error(`CommentPage.items[${index}].nsfw category is invalid.`);
    }
    return category as FeedComment["nsfw"]["categories"][number];
  });
  let nsfwSource = nsfw.source;
  if (nsfwSource !== null && nsfwSource !== "author" && nsfwSource !== "system") {
    throw new Error(`CommentPage.items[${index}].nsfw.source is invalid.`);
  }

  return {
    id: string(source.id, `CommentPage.items[${index}].id`),
    postId: string(source.postId, `CommentPage.items[${index}].postId`),
    parentId: nullableString(source.parentId, `CommentPage.items[${index}].parentId`),
    author: {
      id: string(author.id, `CommentPage.items[${index}].author.id`),
      username: string(author.username, `CommentPage.items[${index}].author.username`),
      displayName: string(author.displayName, `CommentPage.items[${index}].author.displayName`),
      ...(author.avatarUrl === null || typeof author.avatarUrl === "string"
        ? { avatarUrl: author.avatarUrl }
        : {}),
      ...(author.avatarUrlLg === null || typeof author.avatarUrlLg === "string"
        ? { avatarUrlLg: author.avatarUrlLg }
        : {}),
      ...(author.role === null || typeof author.role === "string" ? { role: author.role } : {}),
      ...(author.roleContext === null || typeof author.roleContext === "string"
        ? { roleContext: author.roleContext }
        : {}),
      ...(author.filmsLoggedCount === null || Number.isSafeInteger(author.filmsLoggedCount)
        ? { filmsLoggedCount: author.filmsLoggedCount as number | null }
        : {}),
    },
    body: nullableString(source.body, `CommentPage.items[${index}].body`),
    gifUrl: nullableString(source.gifUrl, `CommentPage.items[${index}].gifUrl`),
    isDeleted: boolean(source.isDeleted, `CommentPage.items[${index}].isDeleted`),
    moderationStatus: moderationStatus as FeedComment["moderationStatus"],
    nsfw: {
      status: nsfwStatus as FeedComment["nsfw"]["status"],
      categories,
      source: nsfwSource as FeedComment["nsfw"]["source"],
    },
    likeCount: count(source.likeCount, `CommentPage.items[${index}].likeCount`),
    isLiked: boolean(source.isLiked, `CommentPage.items[${index}].isLiked`),
    editedAt: nullableString(source.editedAt, `CommentPage.items[${index}].editedAt`),
    createdAt: string(source.createdAt, `CommentPage.items[${index}].createdAt`),
    updatedAt: string(source.updatedAt, `CommentPage.items[${index}].updatedAt`),
  };
}

export function parseCommentPage(value: unknown): CommentPage {
  let source = record(value, "CommentPage");
  if (!Array.isArray(source.items)) throw new Error("CommentPage.items must be an array.");
  if (typeof source.hasMore !== "boolean") throw new Error("CommentPage.hasMore must be a boolean.");
  if (source.nextCursor !== null && typeof source.nextCursor !== "string") {
    throw new Error("CommentPage.nextCursor must be a string or null.");
  }
  return {
    items: source.items.map(parseFeedComment),
    nextCursor: source.nextCursor as string | null,
    hasMore: source.hasMore,
  };
}
