import { afterEach, describe, expect, it, vi } from "vitest";
import {
  closeApiQueue,
  enqueueCounterIncrementJob,
  enqueueProfileFollowApprovalJob,
} from "./jobs.js";
import { resolveQueueRedisUrl } from "./redisConfig.js";

function stubRequiredEnv() {
  vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/db");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test");
  vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test");
  vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_test");
  vi.stubEnv("QUEUE_REDIS_URL", "");
  vi.stubEnv("QUEUE_REDIS_REST_URL", "");
  vi.stubEnv("QUEUE_REDIS_REST_TOKEN", "");
  vi.stubEnv("UPSTASH_REDIS_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
}

describe("counter job enqueue", function () {
  afterEach(async function () {
    await closeApiQueue();
    vi.unstubAllEnvs();
  });

  it("fails closed when the queue is unavailable", async function () {
    stubRequiredEnv();

    await expect(
      enqueueCounterIncrementJob({
        targetTable: "posts",
        targetId: "post_1",
        counterName: "likeCount",
        delta: 1,
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "COUNTER_QUEUE_UNAVAILABLE",
    });
  });

  it("rejects invalid deltas before touching the queue", async function () {
    await expect(
      enqueueCounterIncrementJob({
        targetTable: "posts",
        targetId: "post_1",
        counterName: "likeCount",
        delta: 0,
      })
    ).rejects.toMatchObject({
      status: 500,
      code: "COUNTER_QUEUE_INVALID_PAYLOAD",
    });
  });

  it("fails closed when follow-approval queue is unavailable", async function () {
    stubRequiredEnv();

    await expect(
      enqueueProfileFollowApprovalJob({
        targetUserId: "user_1",
        cursor: null,
      })
    ).rejects.toMatchObject({
      status: 503,
      code: "PROFILE_FOLLOW_APPROVAL_QUEUE_UNAVAILABLE",
    });
  });

  it("rejects follow-approval payload with missing target user", async function () {
    stubRequiredEnv();
    vi.stubEnv("QUEUE_REDIS_URL", "redis://127.0.0.1:6379");

    await expect(
      enqueueProfileFollowApprovalJob({
        targetUserId: "",
        cursor: null,
      })
    ).rejects.toMatchObject({
      status: 500,
      code: "PROFILE_FOLLOW_APPROVAL_INVALID_PAYLOAD",
    });
  });

  it("does not use cache Redis as queue Redis once split Redis vars are present", function () {
    stubRequiredEnv();
    vi.stubEnv("RATE_LIMIT_REDIS_URL", "rediss://default:rate-token@example-rate.upstash.io:6379");
    vi.stubEnv("UPSTASH_REDIS_URL", "rediss://default:cache-token@example-cache.upstash.io:6379");

    expect(resolveQueueRedisUrl()).toBe("");
  });

  it("keeps legacy UPSTASH_REDIS_URL queue fallback when split Redis vars are absent", function () {
    stubRequiredEnv();
    vi.stubEnv("UPSTASH_REDIS_URL", "rediss://default:legacy-token@example-legacy.upstash.io:6379");

    expect(resolveQueueRedisUrl()).toBe("rediss://default:legacy-token@example-legacy.upstash.io:6379");
  });
});
