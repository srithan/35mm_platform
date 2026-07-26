export const siteSearchKeys = {
  all: ["site-search"] as const,
  query: (query: string, limit: number) =>
    [...siteSearchKeys.all, query.trim().toLowerCase(), limit] as const,
};
