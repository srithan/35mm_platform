const COUNT_UNITS = [
  { value: 1_000_000_000_000, suffix: "t" },
  { value: 1_000_000_000, suffix: "b" },
  { value: 1_000_000, suffix: "m" },
  { value: 1_000, suffix: "k" },
] as const;

export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const absoluteValue = Math.abs(value);
  if (absoluteValue < 1_000) {
    return `${value}`;
  }

  const unitIndex = COUNT_UNITS.findIndex((candidate) => absoluteValue >= candidate.value);
  if (unitIndex === -1) {
    return `${value}`;
  }

  const unit = COUNT_UNITS[unitIndex];
  let compactValue = value / unit.value;
  let rounded = Math.round(compactValue * 10) / 10;

  // Promote 999.95k -> 1m instead of 1000k.
  if (Math.abs(rounded) >= 1_000 && unitIndex > 0) {
    const promotedUnit = COUNT_UNITS[unitIndex - 1];
    compactValue = value / promotedUnit.value;
    rounded = Math.round(compactValue * 10) / 10;
    const promotedFormatted = Number.isInteger(rounded)
      ? rounded.toString()
      : rounded.toFixed(1);
    return `${promotedFormatted}${promotedUnit.suffix}`;
  }

  const formatted = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);

  return `${formatted}${unit.suffix}`;
}
