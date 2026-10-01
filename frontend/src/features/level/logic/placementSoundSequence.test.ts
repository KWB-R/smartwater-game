import { describe, expect, it } from "vitest";
import {
  getPlacementSoundPlan,
  PLACEMENT_REWARD_BAR_GAP_MS,
  PLACEMENT_SOUND_CHAIN_GAP_MS,
  PLACEMENT_BONUS_BEFORE_BAR_PARTICLES_MS,
  PLACEMENT_COMBO_DIALOG_EXTRA_DELAY_MS,
  PLACEMENT_COMBO_DIALOG_INTRO_FRACTION,
  resolveComboDialogOpenDelayMs,
} from "@/features/level/logic/placementSoundSequence";
import { getSoundDurationMs } from "@/lib/sound/soundDuration";

describe("getPlacementSoundPlan", () => {
  it("waits for place sound before points when intro skipped", () => {
    const placeMs = getSoundDurationMs("puzzle.place");
    const plan = getPlacementSoundPlan({
      waitsForPlacementIntro: false,
      hasBarReward: true,
      hasBonusOverlays: false,
      comboUiAfterPlacement: false,
    });
    expect(plan.bonusOverlayEnqueueDelayMs).toBeNull();
    expect(plan.barSequenceOffsetMs).toBe(
      placeMs + PLACEMENT_SOUND_CHAIN_GAP_MS - PLACEMENT_REWARD_BAR_GAP_MS,
    );
  });

  it("shows bonus first, then bar particles after lead time", () => {
    const placeMs = getSoundDurationMs("puzzle.place");
    const gap = PLACEMENT_SOUND_CHAIN_GAP_MS;
    const plan = getPlacementSoundPlan({
      waitsForPlacementIntro: false,
      hasBarReward: true,
      hasBonusOverlays: true,
      comboUiAfterPlacement: true,
    });
    expect(plan.bonusOverlayEnqueueDelayMs).toBe(placeMs + gap);
    expect(plan.barSequenceOffsetMs).toBe(
      placeMs +
        gap +
        PLACEMENT_BONUS_BEFORE_BAR_PARTICLES_MS -
        PLACEMENT_REWARD_BAR_GAP_MS,
    );
    expect(plan.comboDialogOpenDelayMs).toBeNull();
  });

  it("uses fixed extra delay for combo when no intro", () => {
    const placeMs = getSoundDurationMs("puzzle.place");
    const gap = PLACEMENT_SOUND_CHAIN_GAP_MS;
    const plan = getPlacementSoundPlan({
      waitsForPlacementIntro: false,
      hasBarReward: false,
      hasBonusOverlays: false,
      comboUiAfterPlacement: true,
    });
    expect(plan.comboDialogOpenDelayMs).toBe(
      placeMs + gap + PLACEMENT_COMBO_DIALOG_EXTRA_DELAY_MS,
    );
  });

  it("opens combo at ~80% of intro wall-clock when intro known", () => {
    const plan = getPlacementSoundPlan({
      waitsForPlacementIntro: false,
      hasBarReward: false,
      hasBonusOverlays: false,
      comboUiAfterPlacement: true,
      introWallClockMs: 5_000,
    });
    expect(plan.comboDialogOpenDelayMs).toBe(
      Math.round(5_000 * PLACEMENT_COMBO_DIALOG_INTRO_FRACTION),
    );
  });
});

describe("resolveComboDialogOpenDelayMs", () => {
  it("falls back when intro missing or invalid", () => {
    expect(
      resolveComboDialogOpenDelayMs({
        fallbackDelayMs: 1_750,
        introWallClockMs: null,
      }),
    ).toBe(1_750);
    expect(
      resolveComboDialogOpenDelayMs({
        fallbackDelayMs: 1_750,
        introWallClockMs: 0,
      }),
    ).toBe(1_750);
  });
});
