export type FeedScoreInput = {
  createdAt: Date | string | number;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  now?: Date | string | number;
};

export const FEED_SCORE_RECENCY_WEIGHT = 1000;
export const FEED_SCORE_RECENCY_HALF_LIFE_HOURS = 36;
export const FEED_SCORE_ENGAGEMENT_WEIGHT = 120;
export const FEED_SCORE_COMMENT_WEIGHT = 3;
export const FEED_SCORE_REPOST_WEIGHT = 4;

function toTimestamp(value: Date | string | number): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

function positiveCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

export function computeFeedScore(input: FeedScoreInput): number {
  var createdAtMs = toTimestamp(input.createdAt);
  var nowMs = toTimestamp(input.now ?? new Date());
  var ageHours = Number.isFinite(createdAtMs) && Number.isFinite(nowMs)
    ? Math.max(0, (nowMs - createdAtMs) / 3_600_000)
    : 0;

  // Tunable formula:
  //   recency = 1000 * e^(-ageHours / 36)
  //   engagement = 120 * ln(1 + likes + comments*3 + reposts*4)
  // Recency gives fresh posts a strong baseline that decays smoothly. The
  // logarithm lets engagement lift posts without allowing large accounts to
  // permanently dominate from raw counts alone.
  var recency = FEED_SCORE_RECENCY_WEIGHT *
    Math.exp(-ageHours / FEED_SCORE_RECENCY_HALF_LIFE_HOURS);
  var engagementUnits =
    positiveCount(input.likeCount) +
    positiveCount(input.commentCount) * FEED_SCORE_COMMENT_WEIGHT +
    positiveCount(input.repostCount) * FEED_SCORE_REPOST_WEIGHT;
  var engagement = FEED_SCORE_ENGAGEMENT_WEIGHT * Math.log1p(engagementUnits);

  return recency + engagement;
}
