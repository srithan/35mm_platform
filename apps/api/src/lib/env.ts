function requireEnv(name: string): string {
  var value = process.env[name];
  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }
  return value;
}

export function loadEnv() {
  return {
    DATABASE_URL: requireEnv("DATABASE_URL"),
    CLERK_SECRET_KEY: requireEnv("CLERK_SECRET_KEY"),
    CLERK_PUBLISHABLE_KEY: requireEnv("CLERK_PUBLISHABLE_KEY"),
    CLERK_WEBHOOK_SECRET: requireEnv("CLERK_WEBHOOK_SECRET"),
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID ?? "",
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? "",
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?? "",
    R2_BUCKET: process.env.R2_BUCKET ?? "35mm-media",
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL ?? "",
    R2_PRESIGN_TTL_SECONDS: Number(process.env.R2_PRESIGN_TTL_SECONDS ?? "900"),
    CF_IMAGES_ACCOUNT_HASH: process.env.CF_IMAGES_ACCOUNT_HASH ?? "",
    CF_IMAGES_DELIVERY_BASE_URL: process.env.CF_IMAGES_DELIVERY_BASE_URL ?? "",
    CF_IMAGES_DEFAULT_THUMB_VARIANT: process.env.CF_IMAGES_DEFAULT_THUMB_VARIANT ?? "thumb",
    CF_IMAGES_DEFAULT_FEED_VARIANT: process.env.CF_IMAGES_DEFAULT_FEED_VARIANT ?? "feed",
    CF_IMAGES_DEFAULT_FULL_VARIANT: process.env.CF_IMAGES_DEFAULT_FULL_VARIANT ?? "full",
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
    PORT: Number(process.env.PORT ?? 4000),
  };
}

export type Env = ReturnType<typeof loadEnv>;
