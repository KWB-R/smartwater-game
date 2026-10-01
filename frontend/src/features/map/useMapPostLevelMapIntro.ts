import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLatestRef } from "@/hooks/useLatestRef";
import { isMapDistrictDetailPathname } from "@/features/map/mapDistrictDetailUrl";
import { isGalleriePathname } from "@/routes/paths";
import {
  readMapPostLevelCelebration,
  isMapPostLevelDetailPending,
  isMapPostLevelMapIntroDone,
  isMapPostLevelMapIntroPending,
  shouldDeferMapDistrictHighlightForIntro,
} from "@/features/map/mapPostLevelCelebration";
import { clearMapReturnFromShareState } from "@/features/map/mapPostLevelCelebrationStorage";
import { readMapCelebrationDevReplayNonce } from "@/features/map/mapPostLevelCelebrationDevReplay";
import {
  MAP_POST_LEVEL_MAP_BONUS_AFTER_PRIOR_STEPS_MS,
  MAP_POST_LEVEL_MAP_CONFETTI_MAX_FALL_MS,
  MAP_POST_LEVEL_MAP_CONFETTI_STOP_SPAWN_MS,
  MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS,
  MAP_POST_LEVEL_MAP_OPEN_DETAIL_AFTER_BONUS_GAP_MS,
  MAP_POST_LEVEL_MAP_OPEN_DETAIL_NO_BONUS_MS,
  MAP_POST_LEVEL_MAP_SOLVED_COUNT_DELAY_MS,
} from "@/features/map/mapPostLevelMapIntroTiming";

export type MapPostLevelMapIntroPhase =
  | "idle"
  | "running"
  | "complete";

export function useMapPostLevelMapIntro(params: {
  districtRouteId: string | undefined;
  reducedMotion: boolean;
  onRevealBonus: (() => void) | null;
  /** Nach Farbe und Bonus den Abschlusszustand entfernen und auf der Übersicht bleiben. */
  onIntroComplete: () => void;
}): {
  phase: MapPostLevelMapIntroPhase;
  confettiActive: boolean;
  deferDistrictHighlight: boolean;
  deferSolvedDistrictIncrement: boolean;
  deferMarkerCompletedAppearance: boolean;
  /** Schlüsseländerung zum Start des Bezirks-Partikeleffekts. */
  districtHighlightBurstKey: number;
  revealDistrictHighlight: () => void;
  revealSolvedCount: () => void;
} {
  const { districtRouteId, reducedMotion, onRevealBonus, onIntroComplete } =
    params;
  const location = useLocation();
  const celebration = readMapPostLevelCelebration(location.state, {
    districtRouteId: districtRouteId ?? null,
  });

  const celebrationRef = useLatestRef(celebration);

  const celebrationRunKey =
    celebration && districtRouteId
      ? `${districtRouteId}|${celebration.starCount}|${celebration.fromStarCount}|${readMapCelebrationDevReplayNonce(location.state)}`
      : null;

  const onRevealBonusRef = useLatestRef(onRevealBonus);
  const onIntroCompleteRef = useLatestRef(onIntroComplete);

  const detailPath = isMapDistrictDetailPathname(location.pathname);
  const detailPending = isMapPostLevelDetailPending(location.state);
  const introPending = isMapPostLevelMapIntroPending({
    state: location.state,
    districtRouteId: districtRouteId ?? null,
  });
  const galleryPath = isGalleriePathname(location.pathname);
  /** Die Folge erst nach dem Abschlussdetail starten und nicht auf der Galerie. */
  const shouldRunIntro = Boolean(
    introPending &&
      districtRouteId &&
      !detailPath &&
      !galleryPath &&
      !detailPending &&
      !isMapPostLevelMapIntroDone(location.state),
  );

  const [phase, setPhase] = useState<MapPostLevelMapIntroPhase>("idle");
  const [confettiActive, setConfettiActive] = useState(false);
  const [districtHighlightBurstKey, setDistrictHighlightBurstKey] =
    useState(0);
  const [deferDistrictHighlight, setDeferDistrictHighlight] = useState(() =>
    shouldDeferMapDistrictHighlightForIntro({
      pathname: location.pathname,
      state: location.state,
      districtRouteId,
      introPhase: "idle",
      deferDistrictHighlightState: true,
    }),
  );
  const [deferSolvedDistrictIncrement, setDeferSolvedDistrictIncrement] =
    useState(
      () => Boolean(celebration?.mapDistrictNewlyFullySolved && introPending),
    );
  const [deferMarkerCompletedAppearance, setDeferMarkerCompletedAppearance] =
    useState(() => introPending);
  const startedRef = useRef<string | null>(null);
  /** Verhindert einen erneuten Effektstart nach Unterbrechung desselben Kartenintros. */
  const ranForKeyRef = useRef<string | null>(null);
  const confettiDrainTimerRef = useRef<number | null>(null);

  const clearConfettiDrainTimer = useCallback(() => {
    if (confettiDrainTimerRef.current != null) {
      window.clearTimeout(confettiDrainTimerRef.current);
      confettiDrainTimerRef.current = null;
    }
  }, []);

  const beginConfettiRain = useCallback(() => {
    clearConfettiDrainTimer();
    setConfettiActive(true);
    confettiDrainTimerRef.current = window.setTimeout(() => {
      setConfettiActive(false);
      confettiDrainTimerRef.current = null;
    }, MAP_POST_LEVEL_MAP_CONFETTI_STOP_SPAWN_MS + MAP_POST_LEVEL_MAP_CONFETTI_MAX_FALL_MS);
  }, [clearConfettiDrainTimer]);

  const stopConfettiImmediate = useCallback(() => {
    clearConfettiDrainTimer();
    setConfettiActive(false);
  }, [clearConfettiDrainTimer]);

  const revealMarkerCompletedAppearance = useCallback(() => {
    setDeferMarkerCompletedAppearance(false);
  }, []);

  /** Aktualisiert Bezirksfarbe und Marker ohne Partikeleffekt. */
  const revealDistrictHighlight = useCallback(() => {
    setDeferDistrictHighlight(false);
    revealMarkerCompletedAppearance();
  }, [revealMarkerCompletedAppearance]);

  /** Startet den Partikeleffekt; die Kartenkomponente aktualisiert dabei synchron die Farbe. */
  const triggerDistrictHighlightBurst = useCallback(() => {
    setDistrictHighlightBurstKey((key) => key + 1);
  }, []);

  const revealSolvedCount = useCallback(() => {
    setDeferSolvedDistrictIncrement(false);
  }, []);

  const applyPendingDefers = useCallback(
    (next: NonNullable<typeof celebration>) => {
      setDeferDistrictHighlight(next.mapDistrictWasUnhighlighted);
      setDeferSolvedDistrictIncrement(next.mapDistrictNewlyFullySolved);
      setDeferMarkerCompletedAppearance(true);
    },
    [],
  );

  const clearDefers = useCallback(() => {
    setDeferDistrictHighlight(false);
    setDeferSolvedDistrictIncrement(false);
    setDeferMarkerCompletedAppearance(false);
  }, []);

  /**
   * Bei manuell geöffnetem Detail die ausstehenden Änderungen sofort übernehmen und den Abschlusszustand entfernen.
   * onIntroComplete hier nicht aufrufen, da es die Detailroute zur Übersicht umleiten würde.
   */
  const settleIntroForManualDetail = useCallback(
    (next: NonNullable<typeof celebration>, runKey: string) => {
      clearDefers();
      stopConfettiImmediate();
      if (next.mapRevealBonus) {
        onRevealBonusRef.current?.();
      }
      startedRef.current = runKey;
      ranForKeyRef.current = runKey;
      setPhase("complete");
      clearMapReturnFromShareState();
    },
    [clearDefers, stopConfettiImmediate, onRevealBonusRef],
  );

  // Während des Abschlussdetails Farbe und Marker aufschieben; die Folge noch nicht starten.
  // Bei manuell geöffnetem Detail das laufende Intro ohne erneuten Konfettistart beenden.
  useLayoutEffect(() => {
    if (!introPending) {
      if (!shouldRunIntro) {
        startedRef.current = null;
        ranForKeyRef.current = null;
        setPhase("idle");
        // Laufende Konfettipartikel über den Auslauftimer fertig fallen lassen.
        clearDefers();
      }
      return;
    }
    const pending = celebrationRef.current;
    if (!pending || !celebrationRunKey) {
      return;
    }
    if (detailPending) {
      startedRef.current = null;
      setPhase("idle");
      stopConfettiImmediate();
      applyPendingDefers(pending);
      return;
    }
    if (detailPath) {
      settleIntroForManualDetail(pending, celebrationRunKey);
    }
  }, [
    introPending,
    celebrationRunKey,
    detailPending,
    detailPath,
    shouldRunIntro,
    applyPendingDefers,
    clearDefers,
    stopConfettiImmediate,
    settleIntroForManualDetail,
    celebrationRef,
  ]);

  useLayoutEffect(() => {
    if (!shouldRunIntro || !celebrationRunKey) {
      return;
    }

    if (ranForKeyRef.current === celebrationRunKey) {
      return;
    }
    if (startedRef.current === celebrationRunKey) {
      return;
    }
    startedRef.current = celebrationRunKey;
    ranForKeyRef.current = celebrationRunKey;
    const celebration = celebrationRef.current;
    if (!celebration) {
      return;
    }
    setPhase("running");
    beginConfettiRain();
    applyPendingDefers(celebration);

    if (reducedMotion) {
      clearDefers();
      if (celebration.mapRevealBonus) {
        onRevealBonusRef.current?.();
      }
      setPhase("complete");
      stopConfettiImmediate();
      onIntroCompleteRef.current();
      return;
    }

    const timers: number[] = [];
    const schedule = (fn: () => void, delayMs: number) => {
      timers.push(window.setTimeout(fn, delayMs));
    };

    let lastPreBonusStepMs = 0;
    const markPreBonusStep = (delayMs: number) => {
      lastPreBonusStepMs = Math.max(lastPreBonusStepMs, delayMs);
    };

    if (celebration.mapDistrictWasUnhighlighted) {
      // Bezirksfarbe und Partikel starten gemeinsam; dabei auch die Marker freigeben.
      if (MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS <= 0) {
        triggerDistrictHighlightBurst();
      } else {
        schedule(
          triggerDistrictHighlightBurst,
          MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS,
        );
      }
      markPreBonusStep(MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS);
    } else {
      // Bei bereits gelbem Bezirk die neuen Marker trotzdem früh aktualisieren.
      if (MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS <= 0) {
        revealMarkerCompletedAppearance();
      } else {
        schedule(
          revealMarkerCompletedAppearance,
          MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS,
        );
      }
      markPreBonusStep(MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS);
    }

    if (celebration.mapDistrictNewlyFullySolved) {
      schedule(revealSolvedCount, MAP_POST_LEVEL_MAP_SOLVED_COUNT_DELAY_MS);
      markPreBonusStep(MAP_POST_LEVEL_MAP_SOLVED_COUNT_DELAY_MS);
    }

    let introEndDelay = MAP_POST_LEVEL_MAP_OPEN_DETAIL_NO_BONUS_MS;

    if (celebration.mapRevealBonus) {
      const bonusRevealDelay =
        lastPreBonusStepMs + MAP_POST_LEVEL_MAP_BONUS_AFTER_PRIOR_STEPS_MS;
      schedule(() => onRevealBonusRef.current?.(), bonusRevealDelay);
      introEndDelay =
        bonusRevealDelay + MAP_POST_LEVEL_MAP_OPEN_DETAIL_AFTER_BONUS_GAP_MS;
    }

    schedule(() => {
      setPhase("complete");
      onIntroCompleteRef.current();
    }, introEndDelay);

    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
      }
    };
  }, [
    shouldRunIntro,
    celebrationRunKey,
    reducedMotion,
    revealDistrictHighlight,
    revealMarkerCompletedAppearance,
    revealSolvedCount,
    applyPendingDefers,
    clearDefers,
    beginConfettiRain,
    stopConfettiImmediate,
    celebrationRef,
    onIntroCompleteRef,
    onRevealBonusRef,
    triggerDistrictHighlightBurst,
  ]);

  return {
    phase,
    confettiActive,
    deferDistrictHighlight,
    deferSolvedDistrictIncrement,
    deferMarkerCompletedAppearance,
    districtHighlightBurstKey,
    revealDistrictHighlight,
    revealSolvedCount,
  };
}
