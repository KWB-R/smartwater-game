import { useCallback, useEffect, useRef, useState } from "react";
import { useLatestRef, useSyncRef } from "@/hooks/useLatestRef";
import {
  MAP_DETAIL_SHEET_ENTER_DURATION_MS,
  MAP_DETAIL_SHEET_OPEN_DELAY_MS,
  MAP_POST_LEVEL_STAR_REVEAL_START_MS,
  MAP_POST_LEVEL_STAR_STAGGER_MS,
} from "@/features/map/mapDetailTiming";
import { playSound } from "@/lib/sound/globalSound";

export type MapDetailStarRevealPhase = "idle" | "animating" | "ready";

function clampFromStars(raw: number, targetStars: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.min(3, Math.min(raw, targetStars)));
}

export function useMapDetailStarReveal(params: {
  active: boolean;
  fromStars?: number;
  targetStars: 1 | 2 | 3;
  reducedMotion: boolean;
  sheetEnterDelayMs?: number;
  sheetEnterDurationMs?: number;
}): {
  phase: MapDetailStarRevealPhase;
  displayedStars: number;
  burstSlot: 1 | 2 | 3 | null;
  onStarBurstComplete: () => void;
} {
  const {
    active,
    fromStars: fromStarsParam = 0,
    targetStars,
    reducedMotion,
    sheetEnterDelayMs = MAP_DETAIL_SHEET_OPEN_DELAY_MS,
    sheetEnterDurationMs = MAP_DETAIL_SHEET_ENTER_DURATION_MS,
  } = params;

  const fromStars = clampFromStars(fromStarsParam, targetStars);

  const [phase, setPhase] = useState<MapDetailStarRevealPhase>("idle");
  const [displayedStars, setDisplayedStars] = useState(0);
  const [burstSlot, setBurstSlot] = useState<1 | 2 | 3 | null>(null);
  const timersRef = useRef<number[]>([]);
  const targetRef = useLatestRef(targetStars);
  const fromStarsRef = useLatestRef(fromStars);
  const advancingRef = useRef(false);
  const burstingSlotRef = useRef<1 | 2 | 3 | null>(null);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
    timersRef.current.push(id);
  }, []);

  const finishReady = useCallback(() => {
    setBurstSlot(null);
    burstingSlotRef.current = null;
    setDisplayedStars(targetRef.current);
    setPhase("ready");
    advancingRef.current = false;
  }, [targetRef]);

  const revealSlotRef = useRef<(slot: 1 | 2 | 3) => void>(() => {});

  useSyncRef(revealSlotRef, (slot: 1 | 2 | 3) => {
    advancingRef.current = true;
    burstingSlotRef.current = slot;
    setDisplayedStars(slot);
    setBurstSlot(slot);
    setPhase("animating");
    // Für jeden neu angezeigten Stern einen Effekt starten.
    playSound("points.collect");

    schedule(() => {
      if (!advancingRef.current || burstingSlotRef.current !== slot) {
        return;
      }
      const target = targetRef.current;
      const next = (slot + 1) as 1 | 2 | 3;
      setBurstSlot(null);
      burstingSlotRef.current = null;
      if (next <= target) {
        revealSlotRef.current(next);
        return;
      }
      finishReady();
    }, MAP_POST_LEVEL_STAR_STAGGER_MS);
  });

  const beginSequence = useCallback(() => {
    const target = targetRef.current;
    const baseline = fromStarsRef.current;
    setDisplayedStars(baseline);
    setBurstSlot(null);
    burstingSlotRef.current = null;

    const firstSlot = (baseline + 1) as 1 | 2 | 3;
    if (firstSlot > target) {
      finishReady();
      return;
    }
    revealSlotRef.current(firstSlot);
  }, [finishReady, targetRef, fromStarsRef]);

  const onStarBurstComplete = useCallback(() => {
    /* Die Sternfolge verwendet STAR_STAGGER; Partikeleffekte entfernen sich selbst. */
  }, []);

  useEffect(() => {
    clearTimers();
    advancingRef.current = false;
    if (!active) {
      setPhase("idle");
      setDisplayedStars(0);
      setBurstSlot(null);
      return;
    }

    if (reducedMotion) {
      setDisplayedStars(targetStars);
      setBurstSlot(null);
      setPhase("ready");
      // Ohne Staffelung einen gemeinsamen Sammelsound spielen.
      playSound("points.collect");
      return;
    }

    setPhase("animating");
    setDisplayedStars(fromStars);
    setBurstSlot(null);

    const afterSheetMs = sheetEnterDelayMs + sheetEnterDurationMs;
    const startDelayMs = afterSheetMs + MAP_POST_LEVEL_STAR_REVEAL_START_MS;
    schedule(beginSequence, startDelayMs);

    return clearTimers;
  }, [
    active,
    targetStars,
    fromStars,
    reducedMotion,
    sheetEnterDelayMs,
    sheetEnterDurationMs,
    clearTimers,
    schedule,
    beginSequence,
  ]);

  return {
    phase,
    displayedStars: active ? displayedStars : targetStars,
    burstSlot,
    onStarBurstComplete,
  };
}
