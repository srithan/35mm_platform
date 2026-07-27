import { describe, expect, it } from "vitest";
import { headlineContextUpdate } from "./headlineContext.js";

describe("profile headline context", function () {
  it("accepts explicit context clearing for cinephile profiles", function () {
    expect(headlineContextUpdate("cinephile", null)).toEqual({
      valid: true,
      value: null,
    });
    expect(headlineContextUpdate(" CINEPHILE ", "")).toEqual({
      valid: true,
      value: null,
    });
  });

  it("rejects non-empty context for cinephile profiles", function () {
    expect(headlineContextUpdate("cinephile", "Frame by Frame")).toEqual({
      valid: false,
    });
  });

  it("normalizes and bounds context for non-cinephile profiles", function () {
    expect(headlineContextUpdate("critic", "  Frame by Frame  ")).toEqual({
      valid: true,
      value: "Frame by Frame",
    });
    expect(
      headlineContextUpdate("creator", "123456789012345678901234567890")
    ).toEqual({
      valid: true,
      value: "1234567890123456789012345",
    });
  });
});
