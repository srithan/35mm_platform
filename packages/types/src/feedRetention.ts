export const DEFAULT_FEED_ITEMS_RETENTION_DAYS = 30;

export function parseFeedItemsRetentionDays(value: string | number | undefined): number {
  if (value == null || String(value).trim().length === 0) {
    return DEFAULT_FEED_ITEMS_RETENTION_DAYS;
  }

  var parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_FEED_ITEMS_RETENTION_DAYS;
  }

  return Math.max(1, Math.floor(parsed));
}

export function feedItemsRetentionBoundary(now: Date, retentionDays: number): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}
