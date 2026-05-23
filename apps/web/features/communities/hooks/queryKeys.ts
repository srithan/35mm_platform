export const communityKeys = {
  all: ["communities"] as const,
  list: () => ["communities", "list"] as const,
  detail: (slug: string) => ["communities", "detail", slug] as const,
  feed: (slug: string) => ["communities", "feed", slug] as const,
};
