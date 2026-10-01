import { describe, expect, it } from "vitest";
import {
  clipLevelPlayTutorialRect,
  intersectLevelPlayTutorialRects,
} from "@/features/level/tutorial/levelPlayTutorialRect";

describe("intersectLevelPlayTutorialRects", () => {
  it("returns overlap", () => {
    expect(
      intersectLevelPlayTutorialRects(
        { left: 0, top: 0, width: 100, height: 50 },
        { left: 80, top: 0, width: 40, height: 50 },
      ),
    ).toEqual({ left: 80, top: 0, width: 20, height: 50 });
  });

  it("returns null when disjoint", () => {
    expect(
      intersectLevelPlayTutorialRects(
        { left: 0, top: 0, width: 10, height: 10 },
        { left: 20, top: 0, width: 10, height: 10 },
      ),
    ).toBeNull();
  });
});

describe("clipLevelPlayTutorialRect", () => {
  it("passes through when clip is null", () => {
    const rect = { left: 1, top: 2, width: 30, height: 40 };
    expect(clipLevelPlayTutorialRect(rect, null)).toBe(rect);
  });
});
