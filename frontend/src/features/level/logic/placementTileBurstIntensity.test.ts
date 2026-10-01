import { describe, expect, it } from "vitest";
import {
  PLACEMENT_BURST_INTENSITY_MAX,
  PLACEMENT_BURST_INTENSITY_MIN,
  PLACEMENT_BURST_INTENSITY_ZERO,
  placementTileBurstIntensity,
} from "@/features/level/logic/placementTileBurstIntensity";

describe("placementTileBurstIntensity", () => {
  it("uses a small baseline when no points were scored", () => {
    expect(placementTileBurstIntensity(0)).toBe(PLACEMENT_BURST_INTENSITY_ZERO);
    expect(placementTileBurstIntensity(-2)).toBe(PLACEMENT_BURST_INTENSITY_ZERO);
  });

  it("clamps to min when points are small but positive", () => {
    expect(placementTileBurstIntensity(0.1)).toBe(PLACEMENT_BURST_INTENSITY_MIN);
    expect(placementTileBurstIntensity(1)).toBe(
      Math.max(PLACEMENT_BURST_INTENSITY_MIN, Math.round(8 + 1.25)),
    );
  });

  it("scales with weighted placement score delta", () => {
    expect(placementTileBurstIntensity(2)).toBe(
      Math.max(PLACEMENT_BURST_INTENSITY_MIN, Math.round(8 + 2 * 1.25)),
    );
    expect(placementTileBurstIntensity(10)).toBe(
      Math.min(PLACEMENT_BURST_INTENSITY_MAX, Math.round(8 + 10 * 1.25)),
    );
    expect(placementTileBurstIntensity(20)).toBe(PLACEMENT_BURST_INTENSITY_MAX);
  });
});
