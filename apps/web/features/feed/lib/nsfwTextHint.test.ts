import { describe, expect, it } from "vitest";
import { detectNsfwTextHint } from "./nsfwTextHint";

describe("detectNsfwTextHint", function () {
  it("returns enum categories without duplicates", function () {
    expect(
      detectNsfwTextHint(
        "Content warning: graphic violence, graphic violence, and a sex scene."
      )
    ).toEqual(["sexual_content", "violence"]);
  });

  it("does not flag ordinary film discussion", function () {
    expect(
      detectNsfwTextHint("The final shot is tense, beautifully framed, and deeply moving.")
    ).toEqual([]);
  });
});
