import { describe, expect, it } from "vitest";
import { formatPlacementScoreGainLabel } from "@/features/level/logic/placementScoreGainLabel";

describe("formatPlacementScoreGainLabel", () => {
  it("sums all point types into one label", () => {
    expect(formatPlacementScoreGainLabel(3, 0)).toBe("+3 Punkte");
    expect(formatPlacementScoreGainLabel(3, 2)).toBe("+5 Punkte");
    expect(formatPlacementScoreGainLabel(3, 0, 1)).toBe("+4 Punkte");
    expect(formatPlacementScoreGainLabel(1, 0)).toBe("+1 Punkt");
    expect(formatPlacementScoreGainLabel(0, 0, 0)).toBe("");
  });

  it("labels every gain without mission points as bonus", () => {
    expect(formatPlacementScoreGainLabel(0, 2)).toBe("+2 Bonus");
    expect(formatPlacementScoreGainLabel(0, 0, 4)).toBe("+4 Bonus");
    expect(formatPlacementScoreGainLabel(0, 2, 1)).toBe("+3 Bonus");
  });
});
