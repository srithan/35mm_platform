import type { Db } from "@35mm/db";
import { counterJobDeltas } from "@35mm/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export type FilmListCounterFields = {
  likeCount: number;
  commentCount: number;
  entryCount: number;
};

type FilmListCounterName = keyof FilmListCounterFields;

var FILM_LIST_COUNTER_NAMES: FilmListCounterName[] = [
  "likeCount",
  "commentCount",
  "entryCount",
];

export function applyPendingFilmListCounterDeltas(
  base: FilmListCounterFields,
  deltas: Partial<Record<FilmListCounterName, number>>,
): FilmListCounterFields {
  return {
    likeCount: Math.max(
      0,
      Number(base.likeCount ?? 0) + Number(deltas.likeCount ?? 0),
    ),
    commentCount: Math.max(
      0,
      Number(base.commentCount ?? 0) + Number(deltas.commentCount ?? 0),
    ),
    entryCount: Math.max(
      0,
      Number(base.entryCount ?? 0) + Number(deltas.entryCount ?? 0),
    ),
  };
}

export async function applyVisibleFilmListCountersToRows<
  T extends { id: string } & FilmListCounterFields,
>(db: Pick<Db, "select">, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;

  var listIds = Array.from(
    new Set(
      rows.map(function (row) {
        return row.id;
      }),
    ),
  );
  var deltaRows = await db
    .select({
      targetId: counterJobDeltas.targetId,
      counterName: counterJobDeltas.counterName,
      delta: counterJobDeltas.delta,
    })
    .from(counterJobDeltas)
    .where(
      and(
        eq(counterJobDeltas.targetTable, "film_lists"),
        inArray(counterJobDeltas.targetId, listIds),
        inArray(counterJobDeltas.counterName, FILM_LIST_COUNTER_NAMES),
      ),
    );

  if (deltaRows.length === 0) return rows;

  var deltasByListId = new Map<
    string,
    Partial<Record<FilmListCounterName, number>>
  >();
  for (var deltaRow of deltaRows) {
    if (
      !FILM_LIST_COUNTER_NAMES.includes(
        deltaRow.counterName as FilmListCounterName,
      )
    )
      continue;
    var deltas = deltasByListId.get(deltaRow.targetId) ?? {};
    deltas[deltaRow.counterName as FilmListCounterName] = Number(
      deltaRow.delta ?? 0,
    );
    deltasByListId.set(deltaRow.targetId, deltas);
  }

  return rows.map(function (row) {
    var deltas = deltasByListId.get(row.id);
    if (!deltas) return row;
    return {
      ...row,
      ...applyPendingFilmListCounterDeltas(row, deltas),
    };
  });
}
