import { publicBooleanFlag } from "@/config/uiFlags";

describe("mobile UI flags", () => {
  it("keeps post media carousel opt-in", () => {
    expect(publicBooleanFlag(undefined, false)).toBe(false);
    expect(publicBooleanFlag("false", true)).toBe(false);
    expect(publicBooleanFlag("0", true)).toBe(false);
    expect(publicBooleanFlag("true", false)).toBe(true);
  });
});
