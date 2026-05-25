export const feedKeys = {
  all: ["feed"] as const,
  home: () => ["feed", "home"] as const,
  profile: (username: string) => ["feed", "profile", username] as const,
  post: (postId: string) => ["feed", "post", postId] as const,
  comments: (postId: string) => ["feed", "comments", postId] as const,
};
