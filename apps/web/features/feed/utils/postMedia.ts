import type { Post } from "../types/feed";

export function resolvePostImageUrls(
  post: Pick<Post, "media" | "mediaUrls">
): string[] {
  if (post.mediaUrls && post.mediaUrls.length > 0) {
    return post.mediaUrls;
  }

  return post.media
    .filter(function (item) {
      return item.type === "image";
    })
    .map(function (item) {
      return item.url;
    });
}
