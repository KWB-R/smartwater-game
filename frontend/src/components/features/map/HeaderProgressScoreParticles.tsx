import { useEffect, useRef, useState, type RefObject } from "react";
import {
  PlacementParticleBurst,
  type PlacementParticleFillAbsorb,
} from "@/components/features/level/PlacementParticleBurst";
import {
  getProgressBarFillAbsorb,
  getProgressBarFillAnchor,
  PROGRESS_BAR_FILL_ANIM_MS,
  PROGRESS_BAR_FILL_START_DELAY_MS,
} from "@/features/map/progressBarBurstGeometry";
import "@/components/features/level/session/levelGame.scss";

type BurstState = {
  key: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number;
  endScatter?: { alongMax: number; perpMax: number };
  fillAbsorb?: PlacementParticleFillAbsorb;
  mode: "placement" | "explosion";
  relaxedFlight?: boolean;
};

type Props = {
  progressBarRef: RefObject<HTMLElement | null>;
  score: number;
  maxScore: number;
  /** Auf der Levelseite steuert der Platzierungsablauf die Partikel selbst. */
  suppressAutoBurst?: boolean;
};

export function HeaderProgressScoreParticles({
  progressBarRef,
  score,
  maxScore,
  suppressAutoBurst = false,
}: Props) {
  const prevScoreRef = useRef(score);
  const [burst, setBurst] = useState<BurstState | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotionRef.current = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const prev = prevScoreRef.current;
    prevScoreRef.current = score;

    if (suppressAutoBurst || reducedMotionRef.current) {
      return;
    }
    const delta = score - prev;
    if (delta <= 0.001) {
      return;
    }

    const trackEl = progressBarRef.current;
    if (!trackEl) {
      return;
    }

    const spawn = () => {
      const anchor = getProgressBarFillAnchor(trackEl, score, maxScore);
      const intensity = Math.min(24, Math.max(10, Math.round(8 + delta * 1.15)));
      setBurst({
        key: Date.now(),
        from: anchor,
        to: anchor,
        intensity,
        mode: "explosion",
      });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(spawn);
    });
  }, [score, maxScore, suppressAutoBurst, progressBarRef]);

  if (burst == null) {
    return null;
  }

  return (
    <PlacementParticleBurst
      key={burst.key}
      from={burst.from}
      to={burst.to}
      intensity={burst.intensity}
      endScatter={burst.endScatter}
      fillAbsorb={burst.fillAbsorb}
      mode={burst.mode}
      onComplete={() => setBurst(null)}
    />
  );
}

export type { BurstState };

export function spawnHeaderPlacementParticles(params: {
  progressBarRef: RefObject<HTMLElement | null>;
  /** Punktestand vor der Gutschrift als linker Rand des neuen Balkenabschnitts. */
  scoreFrom: number;
  scoreAtFill: number;
  maxScore: number;
  from: { x: number; y: number };
  intensity: number;
  relaxedFlight?: boolean;
  onBurst: (burst: BurstState) => void;
}): void {
  const trackEl = params.progressBarRef.current;
  if (!trackEl) {
    return;
  }
  const absorb = getProgressBarFillAbsorb(
    trackEl,
    params.scoreFrom,
    params.scoreAtFill,
    params.maxScore,
  );
  params.onBurst({
    key: Date.now(),
    from: params.from,
    to: absorb.anchor,
    intensity: params.intensity,
    fillAbsorb: {
      fillDeltaPx: absorb.fillDeltaPx,
      barHalfHeight: absorb.barHalfHeight,
      fillDurationMs: PROGRESS_BAR_FILL_ANIM_MS,
      fillStartDelayMs: PROGRESS_BAR_FILL_START_DELAY_MS,
    },
    mode: "placement",
    relaxedFlight: params.relaxedFlight,
  });
}
