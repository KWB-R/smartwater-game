import {
  useCallback,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { BoardScene } from "@/components/features/level/scene/pixi/BoardScene";
import type { Level, Tile, GoalFocusDimension } from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { DistrictLevelPuzzleItem, LevelPlacementOrderEntry } from "@/types/content";
import type { ParticleBurstState } from "@/components/features/level/play/LevelPlacingGame";
import { isPlacementValid } from "@/features/level/logic/levelState";
import { PLACEMENT_TOLERANCE_PX } from "@/features/level/logic/points";
import {
  missionPointMatrixForTile,
  sumPlacedTilesPlacementScore,
} from "@/features/level/logic/placementScoring";
import { resolveEndOfPlacementFlow } from "@/features/level/logic/endPlacementFlow";
import { resolvePlacementCommitPlan } from "@/features/level/logic/placementCommitPlan";
import { resolveKombiChildTilesForParent } from "@/features/level/logic/tilePuzzleMatch";
import { schedulePlacementRewardFlow } from "@/features/level/logic/placementRewardFlow";
import { getPlacementSoundPlan } from "@/features/level/logic/placementSoundSequence";
import { placementTileBurstIntensity } from "@/features/level/logic/placementTileBurstIntensity";
import { placedTilesInCmsOrder } from "@/features/level/mappers/endAnimationPlacement";
import { isTileLibraryPlayable } from "@/features/level/logic/tileLibraryPlayability";
import { designPointToViewport } from "@/components/features/level/scene/bridge/designViewRect";
import { tilePlacedVisualDesignCenter, tilePlacedVisualExplosionSpreadPx } from "@/features/level/logic/tilePlacedVisualRect";
import { spawnHeaderPlacementParticles } from "@/components/features/map/HeaderProgressScoreParticles";
import type { ArmPostPlacementGateOptions } from "@/features/level/play/useLevelPhaseSync";
import type { LevelPlayBoardDispatch } from "@/features/level/play/levelPlayBoardState";
import {
  cancelPlacementVideoCommitForTile,
  primePlacementVideosForTile,
  startPlacementVideoOnUserCommit,
} from "@/components/features/level/scene/pixi/placementVideo";
import { hasConfiguredIntro } from "@/components/features/level/scene/pixi/placementVideoMedia";
import { resolvePlacementIntroWallClockMs } from "@/features/level/play/postPlacementLoopGateTiming";
import { playSound, primeSound } from "@/lib/sound/globalSound";
import {
  isLibraryStripScrollGesture,
  applyLevelLibraryStripScrollDelta,
  LIBRARY_THUMB_DRAG_THRESHOLD_PX,
} from "@/features/level/play/levelPageHelpers";

const DRAG_SELECT_LOCK_CLASS = "level-drag-select-lock";

function preventDefaultEvent(event: Event): void {
  event.preventDefault();
}

/** Verhindert Safaris native Auswahl von Zielgrafiken und Videos während des Ziehens. */
function lockDocumentSelection(): () => void {
  const root = document.documentElement;
  root.classList.add(DRAG_SELECT_LOCK_CLASS);
  document.addEventListener("selectstart", preventDefaultEvent, true);
  document.addEventListener("dragstart", preventDefaultEvent, true);
  window.getSelection()?.removeAllRanges();
  return () => {
    root.classList.remove(DRAG_SELECT_LOCK_CLASS);
    document.removeEventListener("selectstart", preventDefaultEvent, true);
    document.removeEventListener("dragstart", preventDefaultEvent, true);
    window.getSelection()?.removeAllRanges();
  };
}

type UseLevelPlacementFlowConfig = {
  level: Level;
  cappedLevel: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  placementOrder: ReadonlyArray<LevelPlacementOrderEntry>;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  currentMaxTileCount: number;
  barMaxScore: number;
  minimumScorePercentage: number | null;
  placementRewardBlocking: boolean;
  libraryIntroBlocking?: boolean;
};

type UseLevelPlacementFlowScene = {
  boardSceneRef: RefObject<BoardScene | null>;
  canvasHostRef: RefObject<HTMLDivElement | null>;
  designFrameRef: RefObject<HTMLDivElement | null>;
  missionBarTrackRef: RefObject<HTMLDivElement | null>;
  reducedMotionForSceneRef: MutableRefObject<boolean>;
};

type UseLevelPlacementFlowFlow = {
  placedTilesForSceneRef: MutableRefObject<PlacedTile[]>;
  pendingSocketTilesRef: MutableRefObject<Tile[]>;
  pendingComboAfterBonusRef: MutableRefObject<boolean>;
  comboRevealTileIdsRef: MutableRefObject<number[]>;
  comboDialogScheduleTimerRef: MutableRefObject<number | null>;
  rewardTimersRef: MutableRefObject<number[]>;
  /** Aktueller Bibliotheksstand zum Auflösen vorgemerkter Kombiteile vor dem Dispatch. */
  availableTilesRef: MutableRefObject<Tile[]>;
  clearRewardTimers: () => void;
  clearComboDialogScheduleTimer: () => void;
  dispatchBoard: LevelPlayBoardDispatch;
  setParticleBursts: Dispatch<SetStateAction<ParticleBurstState[]>>;
  armPostPlacementGateAfterCelebration: (
    options: ArmPostPlacementGateOptions,
  ) => void;
  onPlacementParticleBurstsFinished: () => void;
  /** Konfetti vom letzten platzierten Teil bis zum Vergleich vor dem Quiz. */
  onStartPostPlacementConfetti: () => void;
};

type UseLevelPlacementFlowArgs = {
  config: UseLevelPlacementFlowConfig;
  scene: UseLevelPlacementFlowScene;
  flow: UseLevelPlacementFlowFlow;
};

type UseLevelPlacementFlowResult = {
  handleThumbPointerDown: (tile: Tile, ev: ReactPointerEvent) => void;
  handleParticleBurstComplete: (key: number) => void;
};

export function useLevelPlacementFlow({
  config: {
    level,
    cappedLevel,
    puzzleItems,
    placementOrder,
    missionGoalDimensions,
    currentMaxTileCount,
    barMaxScore,
    minimumScorePercentage,
    placementRewardBlocking,
    libraryIntroBlocking = false,
  },
  scene: {
    boardSceneRef,
    canvasHostRef,
    designFrameRef,
    missionBarTrackRef,
    reducedMotionForSceneRef,
  },
  flow: {
    placedTilesForSceneRef,
    pendingSocketTilesRef,
    pendingComboAfterBonusRef,
    comboRevealTileIdsRef,
    comboDialogScheduleTimerRef,
    rewardTimersRef,
    availableTilesRef,
    clearRewardTimers,
    clearComboDialogScheduleTimer,
    dispatchBoard,
    setParticleBursts,
    armPostPlacementGateAfterCelebration,
    onPlacementParticleBurstsFinished,
    onStartPostPlacementConfetti,
  },
}: UseLevelPlacementFlowArgs): UseLevelPlacementFlowResult {
  const pointerMoveRef = useRef<((e: PointerEvent) => void) | null>(null);
  const pointerUpRef = useRef<((e: PointerEvent) => void) | null>(null);
  const activeDragPointerIdRef = useRef<number | null>(null);
  const unlockDocumentSelectionRef = useRef<(() => void) | null>(null);
  const particleBurstKeyRef = useRef(0);

  const nextParticleBurstKey = useCallback(() => {
    particleBurstKeyRef.current += 1;
    return particleBurstKeyRef.current;
  }, []);

  const enqueueParticleBurst = useCallback(
    (burst: Omit<ParticleBurstState, "key"> & { key?: number }) => {
      const keyed: ParticleBurstState = {
        ...burst,
        key: nextParticleBurstKey(),
      };
      setParticleBursts((current) => [...current, keyed]);
    },
    [nextParticleBurstKey, setParticleBursts],
  );

  const detachPointerTracking = useCallback(() => {
    if (pointerMoveRef.current) {
      window.removeEventListener("pointermove", pointerMoveRef.current);
      pointerMoveRef.current = null;
    }
    if (pointerUpRef.current) {
      window.removeEventListener("pointerup", pointerUpRef.current, true);
      window.removeEventListener("pointercancel", pointerUpRef.current, true);
      pointerUpRef.current = null;
    }
    activeDragPointerIdRef.current = null;
    unlockDocumentSelectionRef.current?.();
    unlockDocumentSelectionRef.current = null;
  }, []);

  const tryCommitPlacement = useCallback(
    (tile: Tile, refX: number, refY: number) => {
      if (!isPlacementValid(tile, refX, refY, PLACEMENT_TOLERANCE_PX)) {
        return false;
      }
      const decision = resolvePlacementCommitPlan({
        tile,
        puzzleItems,
        cappedLevel,
        placedTiles: placedTilesForSceneRef.current,
        currentMaxTileCount,
        placementRewardBlocking,
      });
      if (decision.kind === "rejected") {
        return false;
      }
      const {
        steps,
        prevWeighted,
        targetWeighted,
        hasSocket,
        puzzleCompletesWithPlacement,
        showComboAfterPlacement,
        hasBarReward,
      } = decision;

      const tileId = tile.id;
      const hasBonusOverlays = false;
      const currentPlacedTiles = placedTilesForSceneRef.current;

      const placementKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `p-${tileId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const targetPosition = tile.position;

      if (puzzleCompletesWithPlacement) {
        pendingComboAfterBonusRef.current = false;
        pendingSocketTilesRef.current = [];
        clearComboDialogScheduleTimer();
      }

      const nextPlacedTiles = [
        ...currentPlacedTiles.map((pt) => ({
          ...pt,
          skipPlacementVideoIntro: true,
        })),
        { placementKey, tile, position: targetPosition },
      ];
      placedTilesForSceneRef.current = nextPlacedTiles;

      // Kombiteile vor dem Dispatch auflösen. Der Schreibzugriff auf pendingSocketTilesRef
      // ist ein Seiteneffekt und gehört nicht in den reinen Reducer.

      const stripTile = availableTilesRef.current.find((x) => x.id === tileId);
      const pendingComboTiles =
        stripTile && showComboAfterPlacement
          ? resolveKombiChildTilesForParent(stripTile, level, puzzleItems)
          : [];
      if (pendingComboTiles.length > 0) {
        pendingSocketTilesRef.current = pendingComboTiles;
      }

      dispatchBoard({
        type: "placementCommitted",
        tile,
        nextPlacedTiles,
        pointMatrix: missionPointMatrixForTile(tile, puzzleItems, cappedLevel),
        missionGoalDimensions,
        hasSocket,
        maxTileCountCap: cappedLevel.maximumTileCount,
        showComboAfterPlacement,
        puzzleCompletesWithPlacement,
        pendingComboTiles,
        puzzleItems,
        hasBarReward,
        prevWeighted,
      });
      playSound("puzzle.place");

      const placementPointDelta = steps.baseDelta + steps.focusExtraDelta;
      const particleIntensity = placementTileBurstIntensity(placementPointDelta);

      const spawnBarFlight = (
        pointDelta: number,
        scoreFrom: number,
        scoreTo: number,
      ) => {
        if (reducedMotionForSceneRef.current || pointDelta <= 0) {
          return;
        }
        const intensity = placementTileBurstIntensity(pointDelta);
        let attempts = 0;
        const trySpawn = () => {
          attempts += 1;
          const host = designFrameRef.current ?? canvasHostRef.current;
          const trackEl = missionBarTrackRef.current;
          if (!host || !trackEl) {
            if (attempts < 36) {
              requestAnimationFrame(trySpawn);
            }
            return;
          }
          const center = tilePlacedVisualDesignCenter(tile);
          const from = designPointToViewport(host, center.x, center.y);
          spawnHeaderPlacementParticles({
            progressBarRef: missionBarTrackRef,
            scoreFrom,
            scoreAtFill: scoreTo,
            maxScore: barMaxScore,
            from,
            intensity,
            onBurst: enqueueParticleBurst,
          });
        };
        trySpawn();
      };

      const spawnMissionBarParticles = () => {
        // Das neu gefüllte Balkenstück als Partikelziel verwenden.
        spawnBarFlight(steps.baseDelta, prevWeighted, targetWeighted);
      };

      const spawnBonusBarParticles = () => {
        spawnBarFlight(steps.focusExtraDelta, prevWeighted, targetWeighted);
      };

      const spawnTilePlacementBurst = () => {
        if (reducedMotionForSceneRef.current) {
          return;
        }
        const host = designFrameRef.current ?? canvasHostRef.current;
        if (!host) {
          return;
        }
        const center = tilePlacedVisualDesignCenter(tile);
        const at = designPointToViewport(host, center.x, center.y);
        const spread = tilePlacedVisualExplosionSpreadPx(host, tile);
        enqueueParticleBurst({
          from: at,
          to: at,
          intensity: particleIntensity,
          explosionSpreadPx: spread,
          mode: "explosion",
        });
      };

      spawnTilePlacementBurst();

      const scene = boardSceneRef.current;
      if (scene) {
        const toRender = placedTilesInCmsOrder(nextPlacedTiles, placementOrder);
        void scene.rebuildPlaced(toRender, reducedMotionForSceneRef.current);
      }

      const runPostPlacementCelebration = () => {
        const soundPlan = getPlacementSoundPlan({
          waitsForPlacementIntro: false,
          hasBarReward: hasBarReward,
          hasBonusOverlays,
          comboUiAfterPlacement: showComboAfterPlacement,
        });

        schedulePlacementRewardFlow({
          steps,
          hasSocket: showComboAfterPlacement,
          suppressUnblock: hasBonusOverlays || showComboAfterPlacement,
          prevWeighted,
          targetWeighted,
          rewardTimersRef,
          clearRewardTimers,
          setBarScoreAnimation: (n) =>
            dispatchBoard({ type: "barScoreAnimationSet", value: n }),
          setPlacementRewardBlocking: (b) =>
            dispatchBoard({ type: "rewardBlockingSet", blocking: b }),
          setSecondaryRewardToast: (s) =>
            dispatchBoard({ type: "toastSet", toast: s }),
          setBarScoreGainLabel: (label) =>
            dispatchBoard({ type: "gainLabelSet", label }),
          spawnMissionBarParticles,
          spawnBonusBarParticles,
          playPointsCollectSound: () => playSound("points.collect"),
          sequenceOffsetMs: soundPlan.barSequenceOffsetMs,
        });

        if (soundPlan.comboDialogOpenDelayMs != null) {
          clearComboDialogScheduleTimer();
          const fallbackDelayMs = soundPlan.comboDialogOpenDelayMs;
          const openComboDialog = (delayMs: number) => {
            comboDialogScheduleTimerRef.current = window.setTimeout(() => {
              comboDialogScheduleTimerRef.current = null;
              playSound("bonus.unlock");
              dispatchBoard({ type: "comboDialogOpened" });
            }, delayMs);
          };

          const placementVideo = tile.placementVideo;
          const wantsIntroTiming =
            placementVideo != null && hasConfiguredIntro(placementVideo);

          if (!wantsIntroTiming) {
            openComboDialog(fallbackDelayMs);
            return;
          }

          // -1 kennzeichnet die laufende Messung; null nach clearComboDialogScheduleTimer bedeutet Abbruch.
          comboDialogScheduleTimerRef.current = -1;
          const probeStartedAtMs = performance.now();
          void resolvePlacementIntroWallClockMs(tile).then((introMs) => {
            if (comboDialogScheduleTimerRef.current !== -1) {
              return;
            }
            const planWithIntro = getPlacementSoundPlan({
              waitsForPlacementIntro: false,
              hasBarReward: hasBarReward,
              hasBonusOverlays,
              comboUiAfterPlacement: true,
              introWallClockMs: introMs,
            });
            const targetDelayMs =
              planWithIntro.comboDialogOpenDelayMs ?? fallbackDelayMs;
            const elapsedMs = performance.now() - probeStartedAtMs;
            openComboDialog(Math.max(0, targetDelayMs - elapsedMs));
          });
        }
      };

      runPostPlacementCelebration();

      if (puzzleCompletesWithPlacement) {
        const placementScoreAtEnd = sumPlacedTilesPlacementScore(
          nextPlacedTiles,
          puzzleItems,
          cappedLevel,
        );
        const endFlow = resolveEndOfPlacementFlow(
          placementScoreAtEnd,
          barMaxScore,
          minimumScorePercentage,
        );
        armPostPlacementGateAfterCelebration({
          steps,
          reducedMotion: reducedMotionForSceneRef.current,
          tile,
          placementKey,
          onConfettiStart:
            endFlow.kind !== "failed" ? onStartPostPlacementConfetti : undefined,
        });
      }

      return true;
    },
    [
      placementRewardBlocking,
      placedTilesForSceneRef,
      currentMaxTileCount,
      puzzleItems,
      cappedLevel,
      reducedMotionForSceneRef,
      pendingSocketTilesRef,
      pendingComboAfterBonusRef,
      clearComboDialogScheduleTimer,
      boardSceneRef,
      placementOrder,
      missionGoalDimensions,
      availableTilesRef,
      dispatchBoard,
      level,
      canvasHostRef,
      designFrameRef,
      missionBarTrackRef,
      barMaxScore,
      minimumScorePercentage,
      rewardTimersRef,
      clearRewardTimers,
      enqueueParticleBurst,
      comboDialogScheduleTimerRef,
      armPostPlacementGateAfterCelebration,
      onStartPostPlacementConfetti,
    ],
  );

  const endLibraryDrag = useCallback(() => {
    detachPointerTracking();
    dispatchBoard({ type: "draggingTileSet", tileId: null });
    boardSceneRef.current?.clearDrag();
  }, [boardSceneRef, detachPointerTracking, dispatchBoard]);

  const handleThumbPointerDown = useCallback(
    (tile: Tile, ev: ReactPointerEvent) => {
      if (placementRewardBlocking || libraryIntroBlocking) {
        return;
      }
      if (ev.button !== 0 && ev.pointerType === "mouse") {
        return;
      }

      const startX = ev.clientX;
      const startY = ev.clientY;
      const thresholdSq =
        LIBRARY_THUMB_DRAG_THRESHOLD_PX * LIBRARY_THUMB_DRAG_THRESHOLD_PX;

      if (tile.placed) {
        return;
      }

      if (!isTileLibraryPlayable(tile)) {
        return;
      }
      if (placedTilesForSceneRef.current.length >= currentMaxTileCount) {
        return;
      }
      const scene = boardSceneRef.current;
      if (!scene) {
        return;
      }

      ev.preventDefault();
      unlockDocumentSelectionRef.current?.();
      unlockDocumentSelectionRef.current = lockDocumentSelection();

      let dragStarted = false;
      let stripScrollMode = false;
      let lastScrollClientX = startX;

      activeDragPointerIdRef.current = ev.pointerId;
      // SoundProvider entsperrt den Audiokontext bei Bedarf mit einem vollständigen button.click.
      primeSound();
      if (tile.placementVideo) {
        primePlacementVideosForTile(tile);
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== activeDragPointerIdRef.current) {
          return;
        }
        if (stripScrollMode) {
          const deltaX = e.clientX - lastScrollClientX;
          lastScrollClientX = e.clientX;
          applyLevelLibraryStripScrollDelta(deltaX);
          return;
        }
        if (!dragStarted) {
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          if (dx * dx + dy * dy < thresholdSq) {
            return;
          }
          if (isLibraryStripScrollGesture(dx, dy)) {
            stripScrollMode = true;
            lastScrollClientX = e.clientX;
            applyLevelLibraryStripScrollDelta(e.clientX - startX);
            return;
          }
          dragStarted = true;
          dispatchBoard({ type: "draggingTileSet", tileId: tile.id });
          playSound("puzzle.pickup");
          void scene.beginDragFromTile(tile, e.clientX, e.clientY);
        }
        scene.moveDrag(e.clientX, e.clientY);
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== activeDragPointerIdRef.current) {
          return;
        }
        if (stripScrollMode) {
          detachPointerTracking();
          return;
        }
        if (dragStarted) {
          const { refX, refY } = scene.pointerRef(e.clientX, e.clientY);
          if (tile.placementVideo) {
            startPlacementVideoOnUserCommit(tile);
          }
          const committed = tryCommitPlacement(tile, refX, refY);
          if (!committed && tile.placementVideo) {
            cancelPlacementVideoCommitForTile(tile);
          }
          if (!committed) {
            playSound("puzzle.invalid");
          }
          endLibraryDrag();
        } else {
          detachPointerTracking();
        }
      };

      pointerMoveRef.current = onMove;
      pointerUpRef.current = onUp;
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onUp, true);
    },
    [
      placementRewardBlocking,
      libraryIntroBlocking,
      placedTilesForSceneRef,
      currentMaxTileCount,
      boardSceneRef,
      detachPointerTracking,
      dispatchBoard,
      tryCommitPlacement,
      endLibraryDrag,
    ],
  );

  const handleParticleBurstComplete = useCallback(
    (key: number) => {
      let remaining = 0;
      setParticleBursts((current) => {
        const next = current.filter((b) => b.key !== key);
        remaining = next.length;
        return next;
      });

      if (remaining > 0) {
        return;
      }

      // Die Kombifreischaltung hat einen eigenen Timer; laufende Partikel erhalten.
      if (comboRevealTileIdsRef.current.length > 0) {
        return;
      }
      if (
        pendingSocketTilesRef.current.length > 0 ||
        pendingComboAfterBonusRef.current ||
        comboDialogScheduleTimerRef.current != null
      ) {
        return;
      }
      if (placedTilesForSceneRef.current.length >= currentMaxTileCount) {
        dispatchBoard({ type: "rewardBlockingSet", blocking: false });
        onPlacementParticleBurstsFinished();
      }
    },
    [
      setParticleBursts,
      comboRevealTileIdsRef,
      pendingSocketTilesRef,
      pendingComboAfterBonusRef,
      comboDialogScheduleTimerRef,
      placedTilesForSceneRef,
      currentMaxTileCount,
      dispatchBoard,
      onPlacementParticleBurstsFinished,
    ],
  );

  return {
    handleThumbPointerDown,
    handleParticleBurstComplete,
  };
}
