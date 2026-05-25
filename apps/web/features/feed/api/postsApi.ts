import type { Post } from "../types/feed";
import { adaptPostToFeedType } from "./adapters";
import { apiRequest } from "./http";

export interface CreatePostInput {
  type: "text" | "discussion" | "log" | "review" | "image";
  headline?: string;
  body: string;
  film?: {
    id: string;
    tmdbId?: number;
    title: string;
    year: number | null;
    posterUrl: string | null;
    genres: string[];
    rating: number | null;
  } | null;
  media?: Array<{
    type: "image" | "video" | "film_embed" | "none";
    url: string;
    thumbnailUrl?: string;
    altText?: string;
  }>;
  mediaUrls?: string[];
  linkPreview?: {
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  } | null;
}

export interface UpdatePostInput {
  postId: string;
  body?: string;
  headline?: string | null;
  filmId?: string | null;
}

export async function fetchPost(postId: string, token?: string | null): Promise<Post> {
  const raw = await apiRequest<unknown>(`/v1/feed/posts/${encodeURIComponent(postId)}`, {
    token,
  });
  return adaptPostToFeedType(raw as Parameters<typeof adaptPostToFeedType>[0]);
}

export async function createPost(input: CreatePostInput, token: string | null): Promise<Post> {
  const raw = await apiRequest<unknown>("/v1/feed", {
    method: "POST",
    token,
    body: input,
  });
  return adaptPostToFeedType(raw as Parameters<typeof adaptPostToFeedType>[0]);
}

export async function updatePost(input: UpdatePostInput, token: string | null): Promise<Post> {
  const { postId, ...payload } = input;
  const raw = await apiRequest<unknown>(`/v1/feed/posts/${encodeURIComponent(postId)}`, {
    method: "PATCH",
    token,
    body: payload,
  });
  return adaptPostToFeedType(raw as Parameters<typeof adaptPostToFeedType>[0]);
}

export async function deletePost(postId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/feed/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    token,
  });
}

export async function likePost(postId: string, token: string | null): Promise<{ likeCount: number }> {
  return apiRequest<{ likeCount: number }>(`/v1/feed/posts/${encodeURIComponent(postId)}/likes`, {
    method: "POST",
    token,
  });
}

export async function unlikePost(postId: string, token: string | null): Promise<{ likeCount: number }> {
  return apiRequest<{ likeCount: number }>(`/v1/feed/posts/${encodeURIComponent(postId)}/likes`, {
    method: "DELETE",
    token,
  });
}

export async function repostPost(postId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/feed/posts/${encodeURIComponent(postId)}/reposts`, {
    method: "POST",
    token,
  });
}

export async function unrepostPost(postId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/feed/posts/${encodeURIComponent(postId)}/reposts`, {
    method: "DELETE",
    token,
  });
}

export async function bookmarkPost(postId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/feed/posts/${encodeURIComponent(postId)}/bookmarks`, {
    method: "POST",
    token,
  });
}

export async function unbookmarkPost(postId: string, token: string | null): Promise<void> {
  await apiRequest<{ ok: true }>(`/v1/feed/posts/${encodeURIComponent(postId)}/bookmarks`, {
    method: "DELETE",
    token,
  });
}

export async function fetchLinkPreview(url: string, token: string | null): Promise<{
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
  provider: "youtube" | "vimeo" | "link";
}> {
  return apiRequest<{
    url: string;
    title: string;
    description: string | null;
    image: string | null;
    domain: string;
    provider: "youtube" | "vimeo" | "link";
  }>(`/v1/media/oembed?url=${encodeURIComponent(url)}`, {
    token,
  });
}
