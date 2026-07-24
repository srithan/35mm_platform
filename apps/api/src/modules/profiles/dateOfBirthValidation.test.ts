import {
  currentUtcDateOnly,
  updateProfileSchema,
  validateDateOfBirth,
} from "@35mm/validators";
import { describe, expect, it } from "vitest";

describe("profile date-of-birth validation", () => {
  it("accepts real date-only values, including leap days", () => {
    expect(validateDateOfBirth("2000-02-29", "2026-07-24")).toEqual({
      success: true,
      value: "2000-02-29",
      parts: { year: 2000, month: 2, day: 29 },
    });
    expect(
      updateProfileSchema.parse({ dateOfBirth: " 2000-02-29 " }),
    ).toEqual({ dateOfBirth: "2000-02-29" });
  });

  it("rejects impossible calendar dates at the shared API boundary", () => {
    expect(validateDateOfBirth("2025-02-29", "2026-07-24")).toMatchObject({
      success: false,
      code: "INVALID_DATE_OF_BIRTH",
    });
    expect(() =>
      updateProfileSchema.parse({ dateOfBirth: "2025-02-29" }),
    ).toThrow("Date of birth must be a valid date");
  });

  it("rejects future dates using the server's current UTC date", () => {
    const today = currentUtcDateOnly();
    const future = currentUtcDateOnly(
      new Date(
        new Date(`${today}T12:00:00.000Z`).getTime() + 86_400_000,
      ),
    );

    expect(validateDateOfBirth(future, today)).toMatchObject({
      success: false,
      code: "FUTURE_DATE_OF_BIRTH",
    });
    expect(() =>
      updateProfileSchema.parse({ dateOfBirth: future }),
    ).toThrow("Date of birth cannot be in the future");
  });
});
