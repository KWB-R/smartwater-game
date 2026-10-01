import { describe, expect, it } from "vitest";
import {
  barPassThresholdScore,
  headerBarPassLineOffsetFromRight,
  levelCompletionStars,
} from "@/features/level/logic/levelBarCompletion";

describe("levelCompletionStars", () => {
  const max = 100;
  const pass = barPassThresholdScore(max);

  it("assigns 1 star below pass threshold", () => {
    expect(levelCompletionStars(pass - 1, max)).toBe(1);
  });

  it("assigns 2 stars at or above pass but below max", () => {
    expect(levelCompletionStars(pass, max)).toBe(2);
    expect(levelCompletionStars(99, max)).toBe(2);
  });

  it("assigns 3 stars at max bar score", () => {
    expect(levelCompletionStars(100, max)).toBe(3);
  });

  it("uses CMS minimumScorePercentage for threshold", () => {
    expect(barPassThresholdScore(100, 50)).toBe(50);
    expect(levelCompletionStars(49, 100, 50)).toBe(1);
    expect(levelCompletionStars(50, 100, 50)).toBe(2);
    expect(headerBarPassLineOffsetFromRight(50)).toBe(0.5);
  });
});
