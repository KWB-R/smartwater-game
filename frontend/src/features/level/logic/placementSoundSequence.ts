import { getSoundDurationMs } from "@/lib/sound/soundDuration";

/** Pause zwischen aufeinanderfolgenden Rückmeldesounds. */
export const PLACEMENT_SOUND_CHAIN_GAP_MS = 72;

/** Erster Balken- und Partikelstart in schedulePlacementRewardFlow. */
export const PLACEMENT_REWARD_BAR_GAP_MS = 90;

/** Partikel zum Balken nach der sichtbaren Missionsbonusrückmeldung starten. */
export const PLACEMENT_BONUS_BEFORE_BAR_PARTICLES_MS = 720;

/** Zusätzliche Pause nach den Sounds vor dem Kombihinweis, wenn kein Introvideo läuft. */
export const PLACEMENT_COMBO_DIALOG_EXTRA_DELAY_MS = 1750;

/** Öffnet den Kombihinweis nach diesem Anteil des Introverlaufs. */
export const PLACEMENT_COMBO_DIALOG_INTRO_FRACTION = 0.8;

/**
 * Verzögerung des Kombihinweises ab der Platzierung.
 * Mit Intro etwa 80 Prozent der tatsächlichen Laufzeit, sonst Soundfolge und zusätzliche Pause.
 */
export function resolveComboDialogOpenDelayMs(options: {
  fallbackDelayMs: number;
  introWallClockMs: number | null | undefined;
}): number {
  const introMs = options.introWallClockMs;
  if (introMs != null && introMs > 0) {
    return Math.round(introMs * PLACEMENT_COMBO_DIALOG_INTRO_FRACTION);
  }
  return options.fallbackDelayMs;
}

export type PlacementSoundPlan = {
  /** Zeitversatz für Balken und Partikel in schedulePlacementRewardFlow. */
  barSequenceOffsetMs: number;
  bonusOverlayEnqueueDelayMs: number | null;
  /** Ohne Bonushinweise den Kombidialog und bonus.unlock gemeinsam starten. */
  comboDialogOpenDelayMs: number | null;
};

export function getPlacementSoundPlan(options: {
  waitsForPlacementIntro: boolean;
  hasBarReward: boolean;
  hasBonusOverlays: boolean;
  comboUiAfterPlacement: boolean;
  /** Tatsächliche Intro-Laufzeit zur zeitlichen Abstimmung des Kombihinweises. */
  introWallClockMs?: number | null;
}): PlacementSoundPlan {
  const placeMs = getSoundDurationMs("puzzle.place");
  const pointsMs = getSoundDurationMs("points.collect");
  const gap = PLACEMENT_SOUND_CHAIN_GAP_MS;

  const afterPlaceMs = options.waitsForPlacementIntro ? 0 : placeMs + gap;

  let bonusOverlayEnqueueDelayMs: number | null = null;
  let comboDialogOpenDelayMs: number | null = null;
  let barSequenceOffsetMs = 0;

  if (options.hasBonusOverlays) {
    bonusOverlayEnqueueDelayMs = afterPlaceMs;
    if (options.hasBarReward) {
      barSequenceOffsetMs = Math.max(
        0,
        afterPlaceMs +
          PLACEMENT_BONUS_BEFORE_BAR_PARTICLES_MS -
          PLACEMENT_REWARD_BAR_GAP_MS,
      );
    }
  } else if (options.hasBarReward) {
    barSequenceOffsetMs = Math.max(
      0,
      afterPlaceMs - PLACEMENT_REWARD_BAR_GAP_MS,
    );
    const afterPointsMs = afterPlaceMs + pointsMs + gap;
    if (options.comboUiAfterPlacement) {
      comboDialogOpenDelayMs = resolveComboDialogOpenDelayMs({
        fallbackDelayMs:
          afterPointsMs + PLACEMENT_COMBO_DIALOG_EXTRA_DELAY_MS,
        introWallClockMs: options.introWallClockMs,
      });
    }
  } else if (options.comboUiAfterPlacement) {
    comboDialogOpenDelayMs = resolveComboDialogOpenDelayMs({
      fallbackDelayMs: afterPlaceMs + PLACEMENT_COMBO_DIALOG_EXTRA_DELAY_MS,
      introWallClockMs: options.introWallClockMs,
    });
  }

  return {
    barSequenceOffsetMs,
    bonusOverlayEnqueueDelayMs,
    comboDialogOpenDelayMs,
  };
}
