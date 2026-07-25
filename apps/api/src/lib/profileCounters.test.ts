import { describe, expect, it } from "vitest";
import { applyPendingProfileCounterDeltas } from "./profileCounters.js";

describe("applyPendingProfileCounterDeltas", function () {
  it("overlays pending film-log writes for immediate profile reads", function () {
    expect(
      applyPendingProfileCounterDeltas(
        {
          filmsLoggedCount: 4,
          followerCount: 10,
          followingCount: 3,
        },
        {
          filmsLoggedCount: 1,
        }
      )
    ).toEqual({
      filmsLoggedCount: 5,
      followerCount: 10,
      followingCount: 3,
    });
  });

  it("never exposes negative profile counters", function () {
    expect(
      applyPendingProfileCounterDeltas(
        {
          filmsLoggedCount: 0,
          followerCount: 0,
          followingCount: 0,
        },
        {
          filmsLoggedCount: -1,
          followerCount: -1,
          followingCount: -1,
        }
      )
    ).toEqual({
      filmsLoggedCount: 0,
      followerCount: 0,
      followingCount: 0,
    });
  });
});
