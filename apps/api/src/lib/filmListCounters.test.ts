import { describe, expect, it } from "vitest";
import { applyPendingFilmListCounterDeltas } from "./filmListCounters.js";

describe("applyPendingFilmListCounterDeltas", function () {
  it("overlays durable pending list deltas for read-after-write accuracy", function () {
    expect(
      applyPendingFilmListCounterDeltas(
        { likeCount: 2, commentCount: 1, entryCount: 0 },
        { likeCount: 1, entryCount: 5 },
      ),
    ).toEqual({ likeCount: 3, commentCount: 1, entryCount: 5 });
  });

  it("never exposes negative counters", function () {
    expect(
      applyPendingFilmListCounterDeltas(
        { likeCount: 0, commentCount: 0, entryCount: 1 },
        { likeCount: -1, entryCount: -2 },
      ),
    ).toEqual({ likeCount: 0, commentCount: 0, entryCount: 0 });
  });
});
