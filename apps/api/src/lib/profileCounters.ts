import type { Db } from "@35mm/db";
import { counterJobDeltas } from "@35mm/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export type ProfileCounterFields = {
  filmsLoggedCount: number;
  followerCount: number;
  followingCount: number;
};

type ProfileCounterName = keyof ProfileCounterFields;

var PROFILE_COUNTER_NAMES: ProfileCounterName[] = [
  "filmsLoggedCount",
  "followerCount",
  "followingCount",
];

export function applyPendingProfileCounterDeltas(
  base: ProfileCounterFields,
  deltas: Partial<Record<ProfileCounterName, number>>
): ProfileCounterFields {
  return {
    filmsLoggedCount: Math.max(
      0,
      Number(base.filmsLoggedCount ?? 0) + Number(deltas.filmsLoggedCount ?? 0)
    ),
    followerCount: Math.max(
      0,
      Number(base.followerCount ?? 0) + Number(deltas.followerCount ?? 0)
    ),
    followingCount: Math.max(
      0,
      Number(base.followingCount ?? 0) + Number(deltas.followingCount ?? 0)
    ),
  };
}

export async function getVisibleProfileCounters(
  db: Pick<Db, "select">,
  userId: string,
  base: ProfileCounterFields
): Promise<ProfileCounterFields> {
  var rows = await db
    .select({
      counterName: counterJobDeltas.counterName,
      delta: counterJobDeltas.delta,
    })
    .from(counterJobDeltas)
    .where(
      and(
        eq(counterJobDeltas.targetTable, "profiles"),
        eq(counterJobDeltas.targetId, userId),
        inArray(counterJobDeltas.counterName, PROFILE_COUNTER_NAMES)
      )
    );

  var deltas: Partial<Record<ProfileCounterName, number>> = {};
  for (var row of rows) {
    if (PROFILE_COUNTER_NAMES.includes(row.counterName as ProfileCounterName)) {
      deltas[row.counterName as ProfileCounterName] = Number(row.delta ?? 0);
    }
  }

  return applyPendingProfileCounterDeltas(base, deltas);
}
