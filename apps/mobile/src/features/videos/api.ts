import type { ApiClient } from "@35mm/api-client";
import type { FeedPost, VideoAssetStatus, VideoPlaybackResult, VideoUploadCredentials } from "@35mm/types";

import {
  parseFeedPage,
  parseVideoAssetStatus,
  parseVideoPlayback,
  parseVideoUploadSession,
} from "./contracts";

export interface PostVideoUploadInput {
  readonly idempotencyKey: string;
  readonly filename: string;
  readonly contentType: string;
  readonly contentLength: number;
}

export interface MobileVideoPreferences {
  readonly autoplay: boolean;
  readonly startWithSound: boolean;
}

function parseMobileVideoPreferences(value: unknown): MobileVideoPreferences {
  if (!value || typeof value !== "object" || !("media" in value)) {
    throw new Error("Settings response is invalid.");
  }
  const media = value.media;
  if (!media || typeof media !== "object" ||
      !("videoAutoplay" in media) || typeof media.videoAutoplay !== "boolean" ||
      !("startWithSound" in media) || typeof media.startWithSound !== "boolean" ||
      !("quietMode" in media) || typeof media.quietMode !== "boolean") {
    throw new Error("Settings media response is invalid.");
  }
  return {
    autoplay: media.videoAutoplay,
    startWithSound: media.startWithSound && !media.quietMode,
  };
}

export function fetchMobileVideoPreferences(client: ApiClient): Promise<MobileVideoPreferences> {
  return client.request("/v1/me/settings", {
    auth: "required",
    operation: "video-posts.settings",
    parser: parseMobileVideoPreferences,
  });
}

export function reservePostVideo(
  client: ApiClient,
  input: PostVideoUploadInput,
  signal?: AbortSignal,
): Promise<VideoUploadCredentials | VideoAssetStatus> {
  return client.request("/v1/videos/uploads", {
    method: "POST",
    auth: "required",
    body: { ...input, purpose: "post" },
    idempotencyKey: input.idempotencyKey,
    maxAttempts: 3,
    operation: "video-posts.reserve-upload",
    parser: parseVideoUploadSession,
    requestClass: "mutation",
    ...(signal ? { signal } : {}),
  });
}

export function acknowledgePostVideo(
  client: ApiClient,
  assetId: string,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<VideoAssetStatus> {
  return client.request(`/v1/videos/${encodeURIComponent(assetId)}/complete`, {
    method: "POST",
    auth: "required",
    idempotencyKey,
    maxAttempts: 3,
    operation: "video-posts.complete-upload",
    parser: parseVideoAssetStatus,
    ...(signal ? { signal } : {}),
  });
}

export function fetchVideoPlayback(
  client: ApiClient,
  assetId: string,
  signal?: AbortSignal,
): Promise<VideoPlaybackResult> {
  return client.request(`/v1/videos/${encodeURIComponent(assetId)}/playback`, {
    auth: "required",
    operation: "video-posts.playback",
    parser: parseVideoPlayback,
    ...(signal ? { signal } : {}),
  });
}

export function createVideoPost(
  client: ApiClient,
  input: {
    readonly body: string;
    readonly asset: VideoAssetStatus;
    readonly idempotencyKey: string;
    readonly visibility: "public" | "followers_only" | "private";
  },
  signal?: AbortSignal,
): Promise<FeedPost> {
  return client.request("/v1/feed", {
    method: "POST",
    auth: "required",
    body: {
      type: "image",
      body: input.body,
      visibility: input.visibility,
      postToFeed: true,
      media: [{
        type: "video",
        videoAssetId: input.asset.id,
        url: `/v1/videos/${input.asset.id}/playback`,
        ...(input.asset.width ? { width: input.asset.width } : {}),
        ...(input.asset.height ? { height: input.asset.height } : {}),
      }],
      mediaUrls: [`/v1/videos/${input.asset.id}/playback`],
    },
    idempotencyKey: input.idempotencyKey,
    maxAttempts: 3,
    operation: "video-posts.create",
    parser: (value) => parseFeedPage({ items: [value], nextCursor: null, hasMore: false }).items[0]!,
    ...(signal ? { signal } : {}),
  });
}

export function setPostLike(client: ApiClient, postId: string, selected: boolean, idempotencyKey: string) {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}/likes`, {
    method: selected ? "POST" : "DELETE",
    auth: "required",
    idempotencyKey,
    maxAttempts: 3,
    operation: selected ? "video-posts.like" : "video-posts.unlike",
    parser: (value) => value,
  });
}

export function setPostRepost(client: ApiClient, postId: string, selected: boolean, idempotencyKey: string) {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}/reposts`, {
    method: selected ? "POST" : "DELETE",
    auth: "required",
    idempotencyKey,
    maxAttempts: 3,
    operation: selected ? "video-posts.repost" : "video-posts.unrepost",
    parser: (value) => value,
  });
}

export function setPostBookmark(client: ApiClient, postId: string, selected: boolean, idempotencyKey: string) {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}/bookmarks`, {
    method: selected ? "POST" : "DELETE",
    auth: "required",
    body: selected ? {} : undefined,
    idempotencyKey,
    maxAttempts: 3,
    operation: selected ? "video-posts.bookmark" : "video-posts.unbookmark",
    parser: (value) => value,
  });
}

export function deletePost(client: ApiClient, postId: string, idempotencyKey: string) {
  return client.request(`/v1/feed/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    auth: "required",
    idempotencyKey,
    maxAttempts: 3,
    operation: "video-posts.delete",
    parser: (value) => value,
  });
}
