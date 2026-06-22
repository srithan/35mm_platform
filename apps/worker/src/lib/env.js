function requireEnv(name) {
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
        UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL ?? "",
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
        MEDIA_JOB_BATCH_SIZE: Number(process.env.MEDIA_JOB_BATCH_SIZE ?? "20"),
        MEDIA_BACKFILL_BATCH_SIZE: Number(process.env.MEDIA_BACKFILL_BATCH_SIZE ?? "100"),
        FEED_HIGH_FOLLOWER_THRESHOLD: Number(process.env.FEED_HIGH_FOLLOWER_THRESHOLD ?? "10000"),
        FEED_FANOUT_BATCH_SIZE: Number(process.env.FEED_FANOUT_BATCH_SIZE ?? "500"),
        FEED_RESCORE_MAX_AGE_HOURS: Number(process.env.FEED_RESCORE_MAX_AGE_HOURS ?? "72"),
        FEED_RESCORE_BATCH_SIZE: Number(process.env.FEED_RESCORE_BATCH_SIZE ?? "500"),
        WORKER_CONCURRENCY: Number(process.env.WORKER_CONCURRENCY ?? "4"),
    };
}
