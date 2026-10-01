import { useEffect } from "react";
import {
  publishLevelHeaderSnapshot,
} from "@/features/level/levelHeaderSnapshot";

export type LevelHeaderSnapshotInputs = {
  levelKey: string;
  hasPlayed: boolean;
  preQuizGateOpen: boolean;
  puzzleFailedOpen: boolean;
  shareScreenActive: boolean;
  quizScreenFromUrl?: boolean;
  winningTotalBarScore: number;
  barDisplayScore: number;
  placementScoreSum: number;
  barMaxScore: number;
  placedCount: number;
  maxTileCount: number;
  draggingTileId: number | null;
  placementRewardBlocking: boolean;
};

/**
 * Veröffentlicht den Headerzustand mit Punkten, Phase und Platzierungszahl
 * für die jeweils aktive Spielphase.
 */
export function usePublishLevelHeaderSnapshots({
  levelKey,
  hasPlayed,
  preQuizGateOpen,
  puzzleFailedOpen,
  shareScreenActive,
  quizScreenFromUrl = false,
  winningTotalBarScore,
  barDisplayScore,
  placementScoreSum,
  barMaxScore,
  placedCount,
  maxTileCount,
  draggingTileId,
  placementRewardBlocking,
}: LevelHeaderSnapshotInputs): void {
  useEffect(() => {
    if (!shareScreenActive) {
      return;
    }
    publishLevelHeaderSnapshot(levelKey, {
      hasPlayed: true,
      phase: "result",
      displayScore: winningTotalBarScore,
      maxScore: barMaxScore,
      placedCount,
      maxPuzzleItems: maxTileCount,
      draggingTile: false,
      placementRewardBlocking: false,
    });
  }, [
    shareScreenActive,
    levelKey,
    winningTotalBarScore,
    barMaxScore,
    placedCount,
    maxTileCount,
  ]);

  useEffect(() => {
    if (
      preQuizGateOpen ||
      puzzleFailedOpen ||
      shareScreenActive ||
      quizScreenFromUrl
    ) {
      return;
    }

    publishLevelHeaderSnapshot(levelKey, {
      hasPlayed,
      phase: "placing",
      displayScore: barDisplayScore,
      maxScore: barMaxScore,
      placedCount,
      maxPuzzleItems: maxTileCount,
      draggingTile: draggingTileId != null,
      placementRewardBlocking,
    });
  }, [
    levelKey,
    hasPlayed,
    barDisplayScore,
    barMaxScore,
    placedCount,
    maxTileCount,
    draggingTileId,
    placementRewardBlocking,
    preQuizGateOpen,
    puzzleFailedOpen,
    shareScreenActive,
    quizScreenFromUrl,
  ]);

  useEffect(() => {
    if (!puzzleFailedOpen || shareScreenActive) {
      return;
    }
    publishLevelHeaderSnapshot(levelKey, {
      hasPlayed: true,
      phase: "placing",
      displayScore: Math.max(barDisplayScore, placementScoreSum),
      maxScore: barMaxScore,
      placedCount,
      maxPuzzleItems: maxTileCount,
      draggingTile: false,
      placementRewardBlocking: false,
      puzzleFailed: true,
    });
  }, [
    puzzleFailedOpen,
    shareScreenActive,
    levelKey,
    barDisplayScore,
    placementScoreSum,
    barMaxScore,
    placedCount,
    maxTileCount,
  ]);

  useEffect(() => {
    if (!preQuizGateOpen || shareScreenActive) {
      return;
    }
    publishLevelHeaderSnapshot(levelKey, {
      hasPlayed: true,
      // Nach bestandenem Puzzle das Abschlussmaskottchen zeigen, bei voller Punktzahl die Maximalvariante.
      phase: "result",
      displayScore: Math.max(barDisplayScore, placementScoreSum),
      maxScore: barMaxScore,
      placedCount,
      maxPuzzleItems: maxTileCount,
      draggingTile: false,
      placementRewardBlocking: false,
    });
  }, [
    preQuizGateOpen,
    shareScreenActive,
    levelKey,
    barDisplayScore,
    placementScoreSum,
    barMaxScore,
    placedCount,
    maxTileCount,
  ]);
}
