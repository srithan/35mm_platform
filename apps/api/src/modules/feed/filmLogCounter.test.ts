import { describe, expect, it } from "vitest";
import {
  countsAsFilmLog,
  filmsLoggedCountDelta,
} from "./filmLogCounter.js";

describe("film log profile counter", function () {
  it.each(["log", "review"])(
    "counts a %s post with a canonical film",
    function (type) {
      expect(
        countsAsFilmLog({
          type,
          filmId: "01JTESTFILM000000000000000",
          isRepost: false,
        })
      ).toBe(true);
      expect(
        filmsLoggedCountDelta(null, {
          type,
          filmId: "01JTESTFILM000000000000000",
          isRepost: false,
        })
      ).toBe(1);
    }
  );

  it("does not count non-diary posts or diary posts without a film", function () {
    expect(
      countsAsFilmLog({
        type: "text",
        filmId: "01JTESTFILM000000000000000",
        isRepost: false,
      })
    ).toBe(false);
    expect(
      countsAsFilmLog({ type: "log", filmId: null, isRepost: false })
    ).toBe(false);
    expect(
      countsAsFilmLog({
        type: "log",
        filmId: "01JTESTFILM000000000000000",
        isRepost: true,
      })
    ).toBe(false);
  });

  it("decrements when a counted post is deleted", function () {
    expect(
      filmsLoggedCountDelta(
        {
          type: "review",
          filmId: "01JTESTFILM000000000000000",
          isRepost: false,
        },
        null
      )
    ).toBe(-1);
  });

  it("tracks film attachment changes without changing unchanged logs", function () {
    expect(
      filmsLoggedCountDelta(
        { type: "log", filmId: null, isRepost: false },
        {
          type: "log",
          filmId: "01JTESTFILM000000000000000",
          isRepost: false,
        }
      )
    ).toBe(1);
    expect(
      filmsLoggedCountDelta(
        {
          type: "log",
          filmId: "01JTESTFILM000000000000000",
          isRepost: false,
        },
        { type: "log", filmId: null, isRepost: false }
      )
    ).toBe(-1);
    expect(
      filmsLoggedCountDelta(
        {
          type: "log",
          filmId: "01JTESTFILM000000000000000",
          isRepost: false,
        },
        {
          type: "log",
          filmId: "01JOTHERFILM00000000000000",
          isRepost: false,
        }
      )
    ).toBe(0);
  });
});
