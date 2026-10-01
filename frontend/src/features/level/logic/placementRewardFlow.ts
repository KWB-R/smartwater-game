import type { MutableRefObject } from "react";
import type { PlacementScoreSteps } from "@/features/level/logic/placementRewardSteps";
import { formatPlacementScoreGainLabel } from "@/features/level/logic/placementScoreGainLabel";
import { PROGRESS_BAR_FILL_ANIM_MS, PROGRESS_BAR_FILL_START_DELAY_MS } from "@/features/map/progressBarBurstGeometry";

const ANIM_MS = PROGRESS_BAR_FILL_ANIM_MS;
/** Partikel vor dem Balkenwachstum starten. */
const FILL_START_DELAY_MS = PROGRESS_BAR_FILL_START_DELAY_MS;
const GAP_MS = 90;
const LABEL_HOLD_MS = 750;

export type PlacementRewardFlowParams = {
  steps: PlacementScoreSteps;
  hasSocket: boolean;
  /** Die Punkteanimation ist beendet; die Platzierung bleibt für weitere Hinweise noch gesperrt. */
  suppressUnblock?: boolean;
  prevWeighted: number;
  targetWeighted: number;
  rewardTimersRef: MutableRefObject<number[]>;
  clearRewardTimers: () => void;
  /** Animierter Zwischenwert des Balkens; null gibt den berechneten Ruhewert frei. */
  setBarScoreAnimation: (n: number | null) => void;
  setPlacementRewardBlocking: (b: boolean) => void;
  setSecondaryRewardToast: (s: string | null) => void;
  setBarScoreGainLabel: (label: string | null) => void;
  spawnMissionBarParticles: () => void;
  spawnBonusBarParticles: () => void;
  playPointsCollectSound: () => void;
  /** Verschiebt Balken und Partikel, damit points.collect auf puzzle.place folgen kann. */
  sequenceOffsetMs?: number;
};

/**
 * Einmalige Balken-Animation: Missions-, Basis- und Bonus-Punkte gemeinsam.
 */
export function schedulePlacementRewardFlow(
  p: PlacementRewardFlowParams,
): void {
  const {
    steps,
    hasSocket,
    suppressUnblock = false,
    prevWeighted,
    targetWeighted,
    rewardTimersRef,
    clearRewardTimers,
    setBarScoreAnimation,
    setPlacementRewardBlocking,
    setSecondaryRewardToast,
    setBarScoreGainLabel,
    spawnMissionBarParticles,
    spawnBonusBarParticles,
    playPointsCollectSound,
    sequenceOffsetMs = 0,
  } = p;

  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    rewardTimersRef.current.push(id);
  };

  const finishRewardSequence = () => {
    // Der letzte Animationswert entspricht dem neuen Punktestand; den Zwischenwert entfernen,
    // damit die Anzeige wieder dem berechneten Wert folgt.
    setBarScoreAnimation(null);
    if (steps.secondaryCelebration) {
      setSecondaryRewardToast(
        `Stark: ${steps.secondaryCelebration.label}!`,
      );
      schedule(() => {
        setSecondaryRewardToast(null);
      }, 1300);
      schedule(() => {
        if (!hasSocket && !suppressUnblock) {
          setPlacementRewardBlocking(false);
        }
      }, 1480);
    } else if (!hasSocket && !suppressUnblock) {
      setPlacementRewardBlocking(false);
    }
  };

  clearRewardTimers();
  setPlacementRewardBlocking(true);
  setBarScoreAnimation(prevWeighted);
  setSecondaryRewardToast(null);
  setBarScoreGainLabel(null);

  const base = sequenceOffsetMs;
  const runMissionPhase = steps.baseDelta > 0;
  const runBonusPhase = steps.focusExtraDelta > 0;
  const missionCollected = steps.missionPointsCollected;
  const bonusCollected = steps.bonusPointsCollected;
  const baseCollected = steps.basePointsCollected;

  if (!runMissionPhase && !runBonusPhase) {
    schedule(finishRewardSequence, base);
    return;
  }

  const creditAt = base + GAP_MS;
  schedule(() => {
    setBarScoreGainLabel(
      formatPlacementScoreGainLabel(
        missionCollected,
        bonusCollected,
        baseCollected,
      ),
    );
    playPointsCollectSound();
    if (runMissionPhase) {
      spawnMissionBarParticles();
    }
    if (runBonusPhase) {
      spawnBonusBarParticles();
    }
  }, creditAt);

  schedule(() => {
    setBarScoreAnimation(targetWeighted);
  }, creditAt + FILL_START_DELAY_MS);

  schedule(
    finishRewardSequence,
    creditAt + FILL_START_DELAY_MS + ANIM_MS + 60,
  );
  schedule(() => {
    setBarScoreGainLabel(null);
  }, creditAt + LABEL_HOLD_MS);
}
