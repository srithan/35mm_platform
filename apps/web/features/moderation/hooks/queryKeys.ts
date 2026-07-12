export const moderationKeys = {
  all: ["moderation"] as const,
  /** Current user's own report history (cursor-paginated). */
  myReports: () => ["moderation", "my-reports"] as const,
  myReport: (reportId: string) => ["moderation", "my-reports", reportId] as const,
};
