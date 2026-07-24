import { z } from "zod";

export const DATE_OF_BIRTH_LENGTH = 10;

export interface DateOnlyParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export type DateOfBirthValidation =
  | {
      readonly success: true;
      readonly value: string;
      readonly parts: DateOnlyParts;
    }
  | {
      readonly success: false;
      readonly code: "INVALID_DATE_OF_BIRTH" | "FUTURE_DATE_OF_BIRTH";
      readonly message: string;
    };

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseDateOnly(value: string): DateOnlyParts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return null;
  }

  return { year, month, day };
}

export function currentUtcDateOnly(now = new Date()): string {
  if (Number.isNaN(now.getTime())) {
    throw new Error("Cannot derive a date-only value from an invalid Date.");
  }
  return now.toISOString().slice(0, DATE_OF_BIRTH_LENGTH);
}

export function validateDateOfBirth(
  input: string,
  today = currentUtcDateOnly(),
): DateOfBirthValidation {
  const value = input.trim();
  const parts = parseDateOnly(value);
  const todayParts = parseDateOnly(today);
  if (!parts || !todayParts) {
    return {
      success: false,
      code: "INVALID_DATE_OF_BIRTH",
      message: "Date of birth must be a valid date in YYYY-MM-DD format",
    };
  }
  if (value > today) {
    return {
      success: false,
      code: "FUTURE_DATE_OF_BIRTH",
      message: "Date of birth cannot be in the future",
    };
  }
  return { success: true, value, parts };
}

export const dateOfBirthSchema = z
  .string()
  .trim()
  .min(1, "Enter your date of birth")
  .superRefine((value, context) => {
    const validation = validateDateOfBirth(value);
    if (validation.success) return;
    context.addIssue({
      code: "custom",
      message: validation.message,
    });
  });
