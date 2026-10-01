import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultCustomRange,
  draftStateForDateShortcut,
  currentUtcCalendarParts,
  formatDay,
  mergeDayCounts,
  normalizeRange,
  rangeForMonth,
  rangeForQuarter,
  rangeForThisWeek,
  rangeForYear,
} from "@/features/analytics/dateRangePresets";

describe("dateRangePresets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-15T12:00:00.000Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("rangeForYear spans Jan 1 to Dec 31 (clamped to today)", () => {
    const range = rangeForYear(2024);
    expect(range.from).toBe("2024-01-01");
    expect(range.to).toBe("2024-12-31");
  });

  it("rangeForMonth uses calendar bounds", () => {
    expect(rangeForMonth(2024, 1)).toEqual({
      from: "2024-02-01",
      to: "2024-02-29",
    });
    expect(rangeForMonth(2025, 0)).toEqual({
      from: "2025-01-01",
      to: "2025-01-31",
    });
  });

  it("rangeForQuarter covers three months", () => {
    expect(rangeForQuarter(2024, 1)).toEqual({
      from: "2024-01-01",
      to: "2024-03-31",
    });
    expect(rangeForQuarter(2024, 4)).toEqual({
      from: "2024-10-01",
      to: "2024-12-31",
    });
  });

  it("normalizeRange swaps inverted bounds", () => {
    expect(normalizeRange("2025-03-10", "2025-03-01")).toEqual({
      from: "2025-03-01",
      to: "2025-03-10",
    });
  });

  it("defaultCustomRange is last 30 UTC days inclusive", () => {
    expect(defaultCustomRange()).toEqual({ from: "2025-02-14", to: "2025-03-15" });
  });

  it("mergeDayCounts replaces duplicates and sorts newest first", () => {
    expect(
      mergeDayCounts(
        [
          { day: "2025-01-02", count: 1 },
          { day: "2025-01-01", count: 2 },
        ],
        [{ day: "2025-01-02", count: 9 }],
      ),
    ).toEqual([
      { day: "2025-01-02", count: 9 },
      { day: "2025-01-01", count: 2 },
    ]);
  });

  it("rangeForThisWeek starts on Monday UTC", () => {
    expect(rangeForThisWeek(new Date("2025-03-05T10:00:00.000Z"))).toEqual({
      from: "2025-03-03",
      to: "2025-03-05",
    });
  });

  it("draftStateForDateShortcut maps month to month mode", () => {
    const draft = draftStateForDateShortcut(
      "month",
      new Date("2025-03-15T12:00:00.000Z"),
    );
    expect(draft.mode).toBe("month");
    expect(draft.range).toEqual({
      from: "2025-03-01",
      to: "2025-03-15",
    });
  });

  it.each([
    ["today", "custom", "2025-03-15"],
    ["week", "custom", "2025-03-10"],
    ["month", "month", "2025-03-01"],
    ["quarter", "quarter", "2025-01-01"],
    ["year", "year", "2025-01-01"],
  ] as const)("begrenzt %s auf den heutigen UTC-Tag", (shortcut, mode, from) => {
    expect(draftStateForDateShortcut(shortcut)).toEqual({
      mode,
      year: 2025,
      monthIndex: 2,
      quarter: 1,
      from,
      to: "2025-03-15",
      range: { from, to: "2025-03-15" },
    });
  });

  it("verwendet UTC auch beim lokalen Jahreswechsel", () => {
    expect(currentUtcCalendarParts(new Date("2026-01-01T00:30:00+01:00"))).toEqual({
      today: "2025-12-31", year: 2025, monthIndex: 11, quarter: 4,
    });
  });

  it("formatiert Datumsschlüssel und behält unvollständige Werte bei", () => {
    expect(formatDay("2025-03-15")).toBe("15.03.2025");
    expect(formatDay("2025-03")).toBe("2025-03");
    expect(formatDay("")).toBe("");
  });
});
