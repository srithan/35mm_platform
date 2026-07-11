function requireEnv(name: string): string {
  var value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

export function loadWorkerEnv() {
  return {
    DATABASE_URL: requireEnv("DATABASE_URL"),
    R2_ACCOUNT_ID: requireEnv("R2_ACCOUNT_ID"),
    R2_ACCESS_KEY_ID: requireEnv("R2_ACCESS_KEY_ID"),
    R2_SECRET_ACCESS_KEY: requireEnv("R2_SECRET_ACCESS_KEY"),
    R2_BUCKET: process.env.R2_BUCKET ?? "35mm-media",
    R2_PUBLIC_BASE_URL: requireEnv("R2_PUBLIC_BASE_URL"),
    CF_IMAGES_ACCOUNT_ID: process.env.CF_IMAGES_ACCOUNT_ID ?? "",
    CF_IMAGES_API_TOKEN: process.env.CF_IMAGES_API_TOKEN ?? "",
    CF_IMAGES_ACCOUNT_HASH: process.env.CF_IMAGES_ACCOUNT_HASH ?? "",
    CF_IMAGES_DELIVERY_BASE_URL: process.env.CF_IMAGES_DELIVERY_BASE_URL ?? "",
    CF_IMAGES_DEFAULT_THUMB_VARIANT: process.env.CF_IMAGES_DEFAULT_THUMB_VARIANT ?? "public",
    CF_IMAGES_DEFAULT_FEED_VARIANT: process.env.CF_IMAGES_DEFAULT_FEED_VARIANT ?? "public",
    CF_IMAGES_DEFAULT_FULL_VARIANT: process.env.CF_IMAGES_DEFAULT_FULL_VARIANT ?? "public",
    ABLY_API_KEY: process.env.ABLY_API_KEY ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    EMAIL_FROM: process.env.EMAIL_FROM ?? "35mm <notifications@35mm.app>",
    EMAIL_UNSUBSCRIBE_SECRET: process.env.EMAIL_UNSUBSCRIBE_SECRET ?? "",
    APP_BASE_URL: process.env.APP_BASE_URL ?? "http://localhost:3000",
    API_PUBLIC_BASE_URL: process.env.API_PUBLIC_BASE_URL ?? "http://localhost:4000",
    NOTIFICATION_EMAIL_COOLDOWN_MINUTES: Number(process.env.NOTIFICATION_EMAIL_COOLDOWN_MINUTES ?? "60"),
    RATE_LIMIT_REDIS_URL: process.env.RATE_LIMIT_REDIS_URL ?? "",
    RATE_LIMIT_REDIS_REST_URL: process.env.RATE_LIMIT_REDIS_REST_URL ?? "",
    RATE_LIMIT_REDIS_REST_TOKEN: process.env.RATE_LIMIT_REDIS_REST_TOKEN ?? "",
    QUEUE_REDIS_URL: process.env.QUEUE_REDIS_URL ?? "",
    QUEUE_REDIS_REST_URL: process.env.QUEUE_REDIS_REST_URL ?? "",
    QUEUE_REDIS_REST_TOKEN: process.env.QUEUE_REDIS_REST_TOKEN ?? "",
    UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL ?? "",
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    MEDIA_JOB_BATCH_SIZE: Number(process.env.MEDIA_JOB_BATCH_SIZE ?? "20"),
    MEDIA_BACKFILL_BATCH_SIZE: Number(process.env.MEDIA_BACKFILL_BATCH_SIZE ?? "100"),
    FEED_HIGH_FOLLOWER_THRESHOLD: Number(process.env.FEED_HIGH_FOLLOWER_THRESHOLD ?? "10000"),
    FEED_FANOUT_BATCH_SIZE: Number(process.env.FEED_FANOUT_BATCH_SIZE ?? "500"),
    FEED_RESCORE_MAX_AGE_HOURS: Number(process.env.FEED_RESCORE_MAX_AGE_HOURS ?? "72"),
    FEED_RESCORE_STALE_AFTER_MINUTES: Number(process.env.FEED_RESCORE_STALE_AFTER_MINUTES ?? "60"),
    FEED_RESCORE_BATCH_SIZE: Number(process.env.FEED_RESCORE_BATCH_SIZE ?? "500"),
    FEED_RESCORE_INTERVAL_MINUTES: Number(process.env.FEED_RESCORE_INTERVAL_MINUTES ?? "5"),
    FEED_ITEMS_RETENTION_DAYS: Number(process.env.FEED_ITEMS_RETENTION_DAYS ?? "30"),
    FEED_ITEMS_PRUNE_BATCH_SIZE: Number(process.env.FEED_ITEMS_PRUNE_BATCH_SIZE ?? "5000"),
    FEED_ITEMS_PRUNE_MAX_BATCHES: Number(process.env.FEED_ITEMS_PRUNE_MAX_BATCHES ?? "20"),
    FEED_ITEMS_PRUNE_INTERVAL_MINUTES: Number(process.env.FEED_ITEMS_PRUNE_INTERVAL_MINUTES ?? "60"),
    WORKER_CONCURRENCY: Number(process.env.WORKER_CONCURRENCY ?? "4"),
    WORKER_ENABLED: (process.env.WORKER_ENABLED ?? "true").toLowerCase() !== "false",
  };
}

export type WorkerEnv = ReturnType<typeof loadWorkerEnv>;
