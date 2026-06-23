import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveProfileAvatarUrl, resolveProfileCoverUrl, resolvePublicMediaUrl } from "./url.js";

function stubRequiredEnv() {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
  vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test");
  vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("R2_BUCKET", "35mm-media");
  vi.stubEnv("R2_PUBLIC_BASE_URL", "https://media.example.com");
}

describe("media url resolution", function () {
  afterEach(function () {
    vi.unstubAllEnvs();
  });

  it("returns stable public URLs for avatar media", async function () {
    stubRequiredEnv();

    await expect(
      resolvePublicMediaUrl("https://media.example.com/users/user_1/avatar/avatar.webp")
    ).resolves.toBe("https://media.example.com/users/user_1/avatar/avatar.webp");
  });

  it("returns stable public URLs for cover media from path-style R2 URLs", async function () {
    stubRequiredEnv();

    await expect(
      resolvePublicMediaUrl(
        "https://account.r2.cloudflarestorage.com/35mm-media/users/user_1/cover/cover.webp?X-Amz-Signature=old"
      )
    ).resolves.toBe("https://media.example.com/users/user_1/cover/cover.webp");
  });

  it("expands bare avatar filenames to stable public profile media URLs", async function () {
    stubRequiredEnv();

    await expect(
      resolveProfileAvatarUrl("mqpxglbu-65425433-46b5-40dd-93ca-4d0c6217cfb4.jpg", "user_1")
    ).resolves.toBe(
      "https://media.example.com/users/user_1/avatar/mqpxglbu-65425433-46b5-40dd-93ca-4d0c6217cfb4.jpg"
    );
  });

  it("returns avatar variant URL when available", async function () {
    stubRequiredEnv();

    await expect(
      resolveProfileAvatarUrl("original.jpg", "user_1", {
        sm: "https://media.example.com/users/user_1/avatar/sm_original.webp",
      })
    ).resolves.toBe("https://media.example.com/users/user_1/avatar/sm_original.webp");
  });

  it("expands bare cover filenames to stable public profile media URLs", async function () {
    stubRequiredEnv();

    await expect(resolveProfileCoverUrl("cover.webp", "user_1")).resolves.toBe(
      "https://media.example.com/users/user_1/cover/cover.webp"
    );
  });

  it("does not rewrite post media to public profile URLs", async function () {
    stubRequiredEnv();

    await expect(
      resolvePublicMediaUrl("https://media.example.com/users/user_1/post_media/photo.webp")
    ).resolves.toBe("https://media.example.com/users/user_1/post_media/photo.webp");
  });
});
