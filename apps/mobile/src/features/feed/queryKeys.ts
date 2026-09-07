export const feedKeys = {
  all: ["video-posts"] as const,
  home: () => [...feedKeys.all, "feed"] as const,
  post: (postId: string) => [...feedKeys.all, "post", postId] as const,
  comments: (postId: string) => [...feedKeys.post(postId), "comments"] as const,
};
