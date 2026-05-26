import type { Post } from "../types/feed";

export function resolvePostImageUrls(
  post: Pick<Post, "media" | "mediaUrls">,
  variant: "thumb" | "feed" | "full" = "feed"
): string[] {
  if (variant === "feed" && post.mediaUrls && post.mediaUrls.length > 0) {
    return post.mediaUrls;
  }

  return post.media
    .filter(function (item) {
      return item.type === "image";
    })
    .map(function (item) {
      if (variant === "thumb") {
        return item.variants?.thumb || item.variants?.feed || item.url;
      }
      if (variant === "full") {
        return item.variants?.full || item.url;
      }
      return item.variants?.feed || item.url;
    });
}
