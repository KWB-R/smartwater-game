import { utcDayKey } from "@/features/analytics/visitDayKey";

export type AnalyticsRangeMode = "year" | "month" | "quarter" | "custom";

export type DateRangeShortcut =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year";

export const DATE_RANGE_SHORTCUTS: {
  id: DateRangeShortcut;
  label: string;
}[] = [
  { id: "today", label: "Heute" },
  { id: "week", label: "Diese Woche" },
  { id: "month", label: "Dieser Monat" },
  { id: "quarter", label: "Quartal" },
  { id: "year", label: "Jahr" },
];

export type DateRange = {
  from: string;
  to: string;
};

export const DAY_PAGE_SIZE = 20;

const MONTH_LABELS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export const QUARTER_OPTIONS = [
  { value: 1, label: "Q1 (Jan–Mär)" },
  { value: 2, label: "Q2 (Apr–Jun)" },
  { value: 3, label: "Q3 (Jul–Sep)" },
  { value: 4, label: "Q4 (Okt–Dez)" },
] as const;

export function monthLabel(monthIndex: number): string {
  return MONTH_LABELS[monthIndex] ?? String(monthIndex + 1);
}

/** UTC-Jahre von `startYear` bis heute (inkl.). */
export function availableYears(startYear = 2024): number[] {
  const end = Number(utcDayKey().slice(0, 4));
  const start = Math.min(startYear, end);
  const years: number[] = [];
  for (let y = end; y >= start; y -= 1) {
    years.push(y);
  }
  return years;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function lastDayOfMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function clampToToday(day: string): string {
  const today = utcDayKey();
  return day > today ? today : day;
}

export function rangeForYear(year: number): DateRange {
  return {
    from: `${year}-01-01`,
    to: clampToToday(`${year}-12-31`),
  };
}

/** `monthIndex` 0–11. */
export function rangeForMonth(year: number, monthIndex: number): DateRange {
  const last = lastDayOfMonthUtc(year, monthIndex);
  const m = pad2(monthIndex + 1);
  return {
    from: `${year}-${m}-01`,
    to: clampToToday(`${year}-${m}-${pad2(last)}`),
  };
}

/** `quarter` 1–4. */
export function rangeForQuarter(year: number, quarter: number): DateRange {
  const q = Math.min(4, Math.max(1, Math.floor(quarter)));
  const startMonth = (q - 1) * 3;
  const endMonth = startMonth + 2;
  const last = lastDayOfMonthUtc(year, endMonth);
  return {
    from: `${year}-${pad2(startMonth + 1)}-01`,
    to: clampToToday(`${year}-${pad2(endMonth + 1)}-${pad2(last)}`),
  };
}

function daysAgoUtc(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function defaultCustomRange(): DateRange {
  return { from: daysAgoUtc(29), to: utcDayKey() };
}

export function currentUtcCalendarParts(date = new Date()) {
  const today = utcDayKey(date);
  return {
    today,
    year: Number(today.slice(0, 4)),
    monthIndex: Number(today.slice(5, 7)) - 1,
    quarter: Math.floor((Number(today.slice(5, 7)) - 1) / 3) + 1,
  };
}

function rangeForToday(date = new Date()): DateRange {
  const today = utcDayKey(date);
  return { from: today, to: today };
}

/** Kalenderwoche Montag–Sonntag (UTC), Ende höchstens heute. */
export function rangeForThisWeek(date = new Date()): DateRange {
  const today = utcDayKey(date);
  const anchor = new Date(`${today}T12:00:00.000Z`);
  const weekday = anchor.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = new Date(anchor);
  monday.setUTCDate(anchor.getUTCDate() - daysFromMonday);
  return {
    from: monday.toISOString().slice(0, 10),
    to: today,
  };
}

function rangeForThisMonth(date = new Date()): DateRange {
  const { year, monthIndex } = currentUtcCalendarParts(date);
  return rangeForMonth(year, monthIndex);
}

function rangeForThisQuarter(date = new Date()): DateRange {
  const { year, quarter } = currentUtcCalendarParts(date);
  return rangeForQuarter(year, quarter);
}

function rangeForThisYear(date = new Date()): DateRange {
  const { year } = currentUtcCalendarParts(date);
  return rangeForYear(year);
}

function rangeForDateShortcut(
  shortcut: DateRangeShortcut,
  date = new Date(),
): DateRange {
  switch (shortcut) {
    case "today":
      return rangeForToday(date);
    case "week":
      return rangeForThisWeek(date);
    case "month":
      return rangeForThisMonth(date);
    case "quarter":
      return rangeForThisQuarter(date);
    case "year":
      return rangeForThisYear(date);
  }
}

export function draftStateForDateShortcut(
  shortcut: DateRangeShortcut,
  date = new Date(),
): {
  mode: AnalyticsRangeMode;
  year: number;
  monthIndex: number;
  quarter: number;
  from: string;
  to: string;
  range: DateRange;
} {
  const parts = currentUtcCalendarParts(date);
  const range = rangeForDateShortcut(shortcut, date);

  return {
    mode: shortcut === "month" || shortcut === "quarter" || shortcut === "year"
      ? shortcut
      : "custom",
    year: parts.year,
    monthIndex: parts.monthIndex,
    quarter: parts.quarter,
    from: range.from,
    to: range.to,
    range,
  };
}

export function normalizeRange(from: string, to: string): DateRange {
  if (from <= to) return { from, to };
  return { from: to, to: from };
}

export function mergeDayCounts(
  prev: { day: string; count: number }[],
  next: { day: string; count: number }[],
): { day: string; count: number }[] {
  const map = new Map(prev.map((row) => [row.day, row.count]));
  for (const row of next) {
    map.set(row.day, row.count);
  }
  return [...map.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

export function formatDay(day: string): string {
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return day;
  return `${d}.${m}.${y}`;
}
