import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
} from "react";
import { useLatestRef, useSyncRef } from "@/hooks/useLatestRef";
import type { Level } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import { playSound } from "@/lib/sound/globalSound";
import { scheduleScrollLibraryStripToTile } from "@/features/level/logic/levelPageUtils";
import { getComboRevealBurstHoldMs } from "@/features/level/logic/devCelebrationOverlays";
import type { LevelPlayBoardDispatch } from "@/features/level/play/levelPlayBoardState";
import type { LevelPlayFlowRefs } from "@/features/level/play/useLevelPlayFlowRefs";

type UseLevelComboOrchestratorArgs = {
  refs: LevelPlayFlowRefs;
  level: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  reducedMotion: boolean;
  preQuizGateOpen: boolean;
  puzzleFailedOpen: boolean;
  /** Im Brettzustand vorgemerkte Kombiteile, gespiegelt in einer Ref. */
  comboRevealReservedTileIds: ReadonlySet<number>;
  dispatchBoard: LevelPlayBoardDispatch;
};

type UseLevelComboOrchestratorResult = {
  pendingComboAfterBonusRef: MutableRefObject<boolean>;
  rewardTimersRef: MutableRefObject<number[]>;
  comboDialogScheduleTimerRef: MutableRefObject<number | null>;
  clearComboDialogScheduleTimer: () => void;
  clearRewardTimers: () => void;
  dismissComboUi: () => void;
  openComboDialogIfPending: () => void;
  clearComboRevealTimer: () => void;
  finishComboRevealBurst: () => void;
  revealPendingComboTiles: () => void;
};

/**
 * Koordiniert die Kombifreischaltung mit Rückmeldungen, Scrollen und Hervorhebung.
 * Die beteiligten Abläufe teilen sich stabile Refs und werden beim Levelwechsel zurückgesetzt.
 */
export function useLevelComboOrchestrator({
  refs: {
    pendingSocketTilesRef,
    playAdvancedRef,
    comboRevealTileIdsRef,
    comboRevealStripBurstStartedRef,
    comboRevealReservedRef,
    comboRevealTimerRef,
    flashKombiStripRevealRef,
  },
  level,
  puzzleItems,
  reducedMotion,
  preQuizGateOpen,
  puzzleFailedOpen,
  comboRevealReservedTileIds,
  dispatchBoard,
}: UseLevelComboOrchestratorArgs): UseLevelComboOrchestratorResult {
  const rewardTimersRef = useRef<number[]>([]);
  const comboDialogScheduleTimerRef = useRef<number | null>(null);
  const pendingComboAfterBonusRef = useRef(false);
  const comboRevealPopTimerRef = useRef<number | null>(null);
  const preQuizGateOpenRef = useLatestRef(preQuizGateOpen);
  const puzzleFailedOpenRef = useLatestRef(puzzleFailedOpen);

  const clearComboDialogScheduleTimer = useCallback(() => {
    const id = comboDialogScheduleTimerRef.current;
    if (id != null) {
      // -1 kennzeichnet eine laufende Intro-Dauermessung und keine Timer-ID.
      if (id >= 0) {
        window.clearTimeout(id);
      }
      comboDialogScheduleTimerRef.current = null;
    }
  }, []);

  const clearRewardTimers = useCallback(() => {
    rewardTimersRef.current.forEach((id) => window.clearTimeout(id));
    rewardTimersRef.current = [];
  }, []);

  const dismissComboUi = useCallback(() => {
    pendingComboAfterBonusRef.current = false;
    pendingSocketTilesRef.current = [];
    dispatchBoard({ type: "comboDialogDismissed" });
    clearComboDialogScheduleTimer();
    clearRewardTimers();
  }, [
    pendingSocketTilesRef,
    dispatchBoard,
    clearComboDialogScheduleTimer,
    clearRewardTimers,
  ]);

  const openComboDialogIfPending = useCallback(() => {
    if (
      preQuizGateOpenRef.current ||
      puzzleFailedOpenRef.current ||
      playAdvancedRef.current
    ) {
      pendingComboAfterBonusRef.current = false;
      dispatchBoard({ type: "rewardBlockingSet", blocking: false });
      return;
    }
    if (pendingComboAfterBonusRef.current) {
      pendingComboAfterBonusRef.current = false;
      playSound("bonus.unlock");
      dispatchBoard({ type: "comboDialogOpened" });
      return;
    }
    dispatchBoard({ type: "rewardBlockingSet", blocking: false });
  }, [playAdvancedRef, dispatchBoard, preQuizGateOpenRef, puzzleFailedOpenRef]);

  const clearComboRevealTimer = useCallback(() => {
    if (comboRevealTimerRef.current != null) {
      window.clearTimeout(comboRevealTimerRef.current);
      comboRevealTimerRef.current = null;
    }
  }, [comboRevealTimerRef]);

  const finishComboRevealBurst = useCallback(() => {
    clearComboRevealTimer();
    comboRevealTileIdsRef.current = [];
    comboRevealStripBurstStartedRef.current = false;
    dispatchBoard({ type: "comboRevealFinished" });
    // Kombipartikel werden lokal verwaltet; den globalen Partikelzustand hier nicht leeren.
    // Sonst würden noch fliegende Punktepartikel abbrechen.
  }, [
    clearComboRevealTimer,
    comboRevealTileIdsRef,
    comboRevealStripBurstStartedRef,
    dispatchBoard,
  ]);

  const showComboRevealTilesNow = useCallback(() => {
    const ids = comboRevealTileIdsRef.current;
    dispatchBoard({ type: "comboRevealTilesShown", tileIds: ids });
    if (ids.length > 0) {
      playSound("bonus.unlock.short");
      window.setTimeout(
        () => dispatchBoard({ type: "comboRevealPopSet", tileIds: [] }),
        550,
      );
      scheduleScrollLibraryStripToTile(
        ids[0]!,
        reducedMotion ? "auto" : "smooth",
      );
      if (!reducedMotion) {
        comboRevealStripBurstStartedRef.current = true;
        clearComboRevealTimer();
        comboRevealTimerRef.current = window.setTimeout(() => {
          finishComboRevealBurst();
        }, getComboRevealBurstHoldMs(false));
      }
    }
  }, [
    comboRevealTileIdsRef,
    dispatchBoard,
    reducedMotion,
    clearComboRevealTimer,
    comboRevealTimerRef,
    comboRevealStripBurstStartedRef,
    finishComboRevealBurst,
  ]);

  const revealPendingComboTiles = useCallback(() => {
    const pending = pendingSocketTilesRef.current;
    pendingSocketTilesRef.current = [];
    clearComboRevealTimer();
    // Vorgemerkte Teile in die Bibliothek übernehmen, den Dialog schließen und die Platzierung freigeben.
    dispatchBoard({
      type: "comboTilesRevealed",
      pendingTiles: pending,
      puzzleItems,
    });
    if (pending.length === 0) {
      return;
    }

    comboRevealTileIdsRef.current = pending.map((t) => t.id);
    comboRevealStripBurstStartedRef.current = false;
    showComboRevealTilesNow();

    if (reducedMotion) {
      finishComboRevealBurst();
    }
  }, [
    pendingSocketTilesRef,
    clearComboRevealTimer,
    dispatchBoard,
    puzzleItems,
    comboRevealTileIdsRef,
    comboRevealStripBurstStartedRef,
    showComboRevealTilesNow,
    reducedMotion,
    finishComboRevealBurst,
  ]);

  // Die im Reducer vorgemerkten Kombiteile in die gemeinsame Ref übernehmen.
  useSyncRef(comboRevealReservedRef, comboRevealReservedTileIds);

  // Zum neuen Kombiteil scrollen und es kurz hervorheben.
  useSyncRef(flashKombiStripRevealRef, (tileId: number) => {
    scheduleScrollLibraryStripToTile(tileId, reducedMotion ? "auto" : "smooth");
    if (reducedMotion) {
      return;
    }
    playSound("bonus.unlock.short");
    dispatchBoard({ type: "comboRevealPopSet", tileIds: [tileId] });
    if (comboRevealPopTimerRef.current != null) {
      window.clearTimeout(comboRevealPopTimerRef.current);
    }
    comboRevealPopTimerRef.current = window.setTimeout(() => {
      comboRevealPopTimerRef.current = null;
      dispatchBoard({ type: "comboRevealPopSet", tileIds: [] });
    }, 550);
  });

  // Beim Levelwechsel den Kombizustand zurücksetzen.
  useEffect(() => {
    pendingSocketTilesRef.current = [];
    pendingComboAfterBonusRef.current = false;
    dispatchBoard({ type: "comboStateReset" });
    comboRevealTileIdsRef.current = [];
    comboRevealStripBurstStartedRef.current = false;
  }, [
    level,
    pendingSocketTilesRef,
    dispatchBoard,
    comboRevealTileIdsRef,
    comboRevealStripBurstStartedRef,
  ]);

  useEffect(() => () => clearRewardTimers(), [clearRewardTimers]);
  useEffect(() => () => clearComboRevealTimer(), [clearComboRevealTimer]);
  useEffect(
    () => () => {
      if (comboRevealPopTimerRef.current != null) {
        window.clearTimeout(comboRevealPopTimerRef.current);
      }
    },
    [],
  );

  return {
    pendingComboAfterBonusRef,
    rewardTimersRef,
    comboDialogScheduleTimerRef,
    clearComboDialogScheduleTimer,
    clearRewardTimers,
    dismissComboUi,
    openComboDialogIfPending,
    clearComboRevealTimer,
    finishComboRevealBurst,
    revealPendingComboTiles,
  };
}
