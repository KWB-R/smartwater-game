import type { PointerEvent as ReactPointerEvent } from "react";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { GoalFocusDimension, Level, Tile } from "@/features/level/types";
import {
  LevelPlacingGame,
  type ParticleBurstState,
} from "@/components/features/level/play/LevelPlacingGame";
import type { LevelPlayBoardState } from "@/features/level/play/levelPlayBoardState";

type LevelPlacingDockProps = {
  level: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  /** Brettzustand aus dem Reducer. */
  board: LevelPlayBoardState;
  /** Unplatzierte Kacheln für den horizontalen Streifen. */
  availableTiles: Tile[];
  detailStripTiles: Tile[];
  libraryStripLoading: boolean;
  librarySkeletonSlotCount: number;
  letterByTileId: Map<number, string>;
  boardSceneReady: boolean;
  currentMaxTileCount: number;
  /** Anzeigewert des Punktebalkens; die Spielphase kann den Brettwert übersteuern. */
  barDisplayScore: number;
  barMaxScore: number;
  detailTile: Tile | null;
  reducedMotion: boolean;
  particleBursts: readonly ParticleBurstState[];
  libraryIntroEnterTileIds: ReadonlySet<number>;
  libraryIntroBlocking: boolean;
  onComboDialogOpenChange: (open: boolean) => void;
  onComboDialogClosed: () => void;
  onThumbPointerDown: (tile: Tile, ev: ReactPointerEvent) => void;
  onDetailClose: () => void;
  onDetailSelectTile: (tile: Tile) => void;
  onParticleBurstComplete: (key: number) => void;
};

/** Ablage der Spielphase mit Puzzleteilbibliothek. */
export function LevelPlacingDock({
  level,
  puzzleItems,
  missionGoalDimensions,
  board,
  availableTiles,
  detailStripTiles,
  libraryStripLoading,
  librarySkeletonSlotCount,
  letterByTileId,
  boardSceneReady,
  currentMaxTileCount,
  barDisplayScore,
  barMaxScore,
  detailTile,
  reducedMotion,
  particleBursts,
  libraryIntroEnterTileIds,
  libraryIntroBlocking,
  onComboDialogOpenChange,
  onComboDialogClosed,
  onThumbPointerDown,
  onDetailClose,
  onDetailSelectTile,
  onParticleBurstComplete,
}: LevelPlacingDockProps) {
  return (
    <LevelPlacingGame
      level={level}
      puzzleItems={puzzleItems}
      missionGoalDimensions={missionGoalDimensions}
      placementRewardBlocking={board.placementRewardBlocking}
      availableTiles={availableTiles}
      detailStripTiles={detailStripTiles}
      libraryStripLoading={libraryStripLoading}
      librarySkeletonSlotCount={librarySkeletonSlotCount}
      letterByTileId={letterByTileId}
      boardSceneReady={boardSceneReady}
      draggingTileId={board.draggingTileId}
      placedTiles={board.placedTiles}
      currentMaxTileCount={currentMaxTileCount}
      levelPoints={board.levelPoints}
      barDisplayScore={barDisplayScore}
      barMaxScore={barMaxScore}
      detailTile={detailTile}
      reducedMotion={reducedMotion}
      particleBursts={particleBursts}
      secondaryRewardToast={board.secondaryRewardToast}
      comboDialogOpen={board.comboDialogOpen}
      comboDialogTile={board.comboDialogTile}
      onComboDialogOpenChange={onComboDialogOpenChange}
      onComboDialogClosed={onComboDialogClosed}
      hiddenComboTileIds={board.hiddenComboTileIds}
      comboRevealReservedTileIds={board.comboRevealReservedTileIds}
      comboRevealPopTileIds={board.comboRevealPopTileIds}
      libraryIntroEnterTileIds={libraryIntroEnterTileIds}
      libraryIntroBlocking={libraryIntroBlocking}
      onThumbPointerDown={onThumbPointerDown}
      onDetailClose={onDetailClose}
      onDetailSelectTile={onDetailSelectTile}
      onParticleBurstComplete={onParticleBurstComplete}
    />
  );
}
