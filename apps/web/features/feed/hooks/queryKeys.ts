export const feedKeys = {
  all: ["feed"] as const,
  /** Single home feed (following graph). */
  home: ["feed", "following"] as const,
  tab: (tab: string) => ["feed", tab] as const,
  post: (username: string, postId: string) => ["post", username, postId] as const,
  comments: (postId: string) => ["comments", postId] as const,
};
