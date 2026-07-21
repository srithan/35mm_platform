import { describe, expect, it } from "vitest";
import { postMediaGridCellClassName } from "./postMediaGridLayout";

describe("postMediaGridCellClassName", function () {
  it("uses compact landscape cells for a four-image grid", function () {
    expect(postMediaGridCellClassName(4, 0)).toBe("aspect-video");
    expect(postMediaGridCellClassName(4, 3)).toBe("aspect-video");
  });
});
