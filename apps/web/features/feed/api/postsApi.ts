import { getPost as getMockPost } from "../data/mockPosts";
import type { Post } from "../types/feed";
import { adaptPostToFeedType } from "./adapters";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchPost(username: string, postId: string): Promise<Post> {
  await delay(150);
  const raw = getMockPost(username, postId);
  if (!raw) throw new Error(`Post not found: ${postId}`);
  return adaptPostToFeedType(raw);
}

export async function likePost(_postId: string): Promise<{ likeCount: number }> {
  await delay(100);
  if (Math.random() < 0.05) {
    throw new Error("Failed to like post");
  }
  return { likeCount: 0 };
}

export async function unlikePost(_postId: string): Promise<{ likeCount: number }> {
  await delay(100);
  if (Math.random() < 0.05) {
    throw new Error("Failed to unlike post");
  }
  return { likeCount: 0 };
}

export async function repostPost(_postId: string): Promise<void> {
  await delay(150);
}

export async function savePost(_postId: string): Promise<void> {
  await delay(100);
}

export async function unsavePost(_postId: string): Promise<void> {
  await delay(100);
}
