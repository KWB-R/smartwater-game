import { describe, expect, it } from "vitest";
import { postPlacementCelebrationFallbackMs } from "@/features/level/play/postPlacementCelebrationTiming";

describe("postPlacementCelebrationFallbackMs", () => {
  it("includes explosion and bar legs when motion enabled", () => {
    expect(
      postPlacementCelebrationFallbackMs({
        reducedMotion: false,
        steps: {
          baseDelta: 10,
          focusExtraDelta: 5,
          missionPointsCollected: 10,
          bonusPointsCollected: 5,
          basePointsCollected: 0,
          secondaryCelebration: null,
        },
      }),
    ).toBe(520 + 900 + 160);
  });

  it("is short when reduced motion", () => {
    expect(
      postPlacementCelebrationFallbackMs({
        reducedMotion: true,
        steps: {
          baseDelta: 10,
          focusExtraDelta: 0,
          missionPointsCollected: 10,
          bonusPointsCollected: 0,
          basePointsCollected: 0,
          secondaryCelebration: null,
        },
      }),
    ).toBe(200);
  });
});
