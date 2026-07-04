import { eq, sql } from "drizzle-orm";
import { counterJobs, counterJobDeltas } from "@35mm/db/schema";
import { enqueueCounterOutboxDrainJob, type CounterIncrementJobPayload } from "./jobs.js";

type CounterWriter = {
  insert: (table: typeof counterJobs) => {
    values: (values: Array<typeof counterJobs.$inferInsert>) => unknown;
  };
};

function keyFor(payload: CounterIncrementJobPayload): string {
  return payload.targetTable + ":" + payload.targetId + ":" + payload.counterName;
}

function validateCounterDelta(payload: CounterIncrementJobPayload): void {
  if (!Number.isInteger(payload.delta) || payload.delta === 0) {
    throw new Error("Invalid counter delta");
  }

  var allowed: Record<CounterIncrementJobPayload["targetTable"], CounterIncrementJobPayload["counterName"][]> = {
    posts: ["likeCount", "commentCount", "repostCount", "bookmarkCount"],
    comments: ["likeCount"],
    post_polls: ["totalVotes"],
    poll_options: ["voteCount"],
    film_lists: ["likeCount", "commentCount", "entryCount"],
    profiles: ["filmsLoggedCount", "followerCount", "followingCount"],
  };

  if (!allowed[payload.targetTable]?.includes(payload.counterName)) {
    throw new Error("Unsupported counter delta target");
  }
}

export async function recordCounterDeltas(
  db: CounterWriter,
  payloads: CounterIncrementJobPayload | CounterIncrementJobPayload[]
): Promise<void> {
  var list = Array.isArray(payloads) ? payloads : [payloads];
  if (list.length === 0) return;
  var byKey = new Map<string, CounterIncrementJobPayload>();

  for (var payload of list) {
    validateCounterDelta(payload);
    var key = keyFor(payload);
    var existing = byKey.get(key);
    if (existing) {
      existing.delta += payload.delta;
      continue;
    }
    byKey.set(key, { ...payload });
  }

  await db.insert(counterJobs).values(
    list.map(function (payload) {
      return {
        targetTable: payload.targetTable,
        targetId: payload.targetId,
        counterName: payload.counterName,
        delta: payload.delta,
      };
    })
  );

  var writes = Array.from(byKey.values()).filter(function (payload) {
    return payload.delta !== 0;
  });
  if (writes.length === 0) return;

  var writer = db as any;
  var now = new Date();
  for (var write of writes) {
    await writer
      .insert(counterJobDeltas)
      .values({
        targetTable: write.targetTable,
        targetId: write.targetId,
        counterName: write.counterName,
        delta: write.delta,
      })
      .onConflictDoUpdate({
        target: [
          counterJobDeltas.targetTable,
          counterJobDeltas.targetId,
          counterJobDeltas.counterName,
        ],
        set: {
          delta: sql`${counterJobDeltas.delta} + ${write.delta}`,
          updatedAt: now,
        },
      });
  }

  await writer.delete(counterJobDeltas).where(eq(counterJobDeltas.delta, 0));
}

export function wakeCounterOutbox(): void {
  void enqueueCounterOutboxDrainJob().catch(function (error) {
    console.error("[counter.outbox] wake enqueue failed", error);
  });
}
