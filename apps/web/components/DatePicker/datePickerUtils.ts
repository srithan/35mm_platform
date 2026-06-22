const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
}

export function padTwo(value: number): string {
  return value < 10 ? "0" + value : String(value);
}

export function toIsoDate(year: number, month: number, day: number): string {
  return year + "-" + padTwo(month) + "-" + padTwo(day);
}

export function parseIsoDate(value: string): ParsedIsoDate | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDisplayDate(value: string): string | null {
  const parsed = parseIsoDate(value);
  if (!parsed) return null;
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getMonthLabel(month: number): string {
  return MONTHS[month - 1] ?? "";
}

export interface CalendarDayCell {
  day: number;
  inMonth: boolean;
  isoDate: string | null;
  isToday: boolean;
}

export function buildCalendarDays(viewYear: number, viewMonth: number): CalendarDayCell[] {
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const prevMonth = viewMonth === 1 ? 12 : viewMonth - 1;
  const prevYear = viewMonth === 1 ? viewYear - 1 : viewYear;
  const prevMonthDays = daysInMonth(prevYear, prevMonth);
  const cells: CalendarDayCell[] = [];
  const today = new Date();
  const todayIso = toIsoDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  for (let leading = firstWeekday - 1; leading >= 0; leading -= 1) {
    const day = prevMonthDays - leading;
    cells.push({
      day,
      inMonth: false,
      isoDate: null,
      isToday: false,
    });
  }

  for (let dayInMonth = 1; dayInMonth <= totalDays; dayInMonth += 1) {
    const isoDate = toIsoDate(viewYear, viewMonth, dayInMonth);
    cells.push({
      day: dayInMonth,
      inMonth: true,
      isoDate,
      isToday: isoDate === todayIso,
    });
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - (firstWeekday + totalDays) + 1;
    cells.push({
      day,
      inMonth: false,
      isoDate: null,
      isToday: false,
    });
  }

  return cells;
}

export function getSelectableBounds() {
  const today = new Date();
  const maxYear = today.getFullYear();
  const minYear = maxYear - 120;
  return { minYear, maxYear };
}

export function getYearOptions(): number[] {
  const bounds = getSelectableBounds();
  const years: number[] = [];
  for (let year = bounds.maxYear; year >= bounds.minYear; year -= 1) {
    years.push(year);
  }
  return years;
}

export function isSelectableIsoDate(value: string): boolean {
  const parsed = parseIsoDate(value);
  if (!parsed) return false;
  const bounds = getSelectableBounds();
  if (parsed.year < bounds.minYear || parsed.year > bounds.maxYear) return false;
  const candidate = new Date(parsed.year, parsed.month - 1, parsed.day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return candidate.getTime() <= today.getTime();
}

export { MONTHS, WEEKDAY_LABELS };
