import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import { PlacementParticleBurst } from "@/components/features/level/PlacementParticleBurst";
import { DemoDeveloperPointsPanel } from "@/components/features/level/DemoDeveloperPointsPanel";
import { LibraryStrip } from "@/components/features/level/library/LibraryStrip";
import { TileDetailPanel } from "@/components/features/level/library/TileDetailPanel";
import type {
  GoalFocusDimension,
  Level,
  PointMatrix,
  Tile,
} from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import { LevelTileDockInner } from "@/components/features/level/LevelTileDockInner";
import { ComboUnlockDialog } from "@/components/features/level/play/ComboUnlockDialog";
import { SecondaryRewardToast } from "@/components/features/level/play/SecondaryRewardToast";
export type ParticleBurstState = {
  key: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  intensity: number;
  endScatter?: { alongMax: number; perpMax: number };
  fillAbsorb?: {
    fillDeltaPx: number;
    barHalfHeight: number;
    fillDurationMs?: number;
    fillStartDelayMs?: number;
  };
  mode?: "placement" | "explosion";
  relaxedFlight?: boolean;
  explosionSpreadPx?: number;
};

type LevelPlacingGameProps = {
  level: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  placementRewardBlocking: boolean;
  /** Unplatzierte Kacheln für den horizontalen Streifen. */
  availableTiles: Tile[];
  /** Alle Puzzleteile für die Detailnavigation, einschließlich bereits platzierter Teile. */
  detailStripTiles: Tile[];
  libraryStripLoading?: boolean;
  librarySkeletonSlotCount?: number;
  letterByTileId: Map<number, string>;
  boardSceneReady: boolean;
  draggingTileId: number | null;
  placedTiles: PlacedTile[];
  currentMaxTileCount: number;
  levelPoints: PointMatrix;
  barDisplayScore: number;
  barMaxScore: number;
  detailTile: Tile | null;
  reducedMotion: boolean;
  particleBursts: readonly ParticleBurstState[];
  secondaryRewardToast: string | null;
  comboDialogOpen: boolean;
  comboDialogTile: Tile | null;
  onComboDialogOpenChange: (open: boolean) => void;
  onComboDialogClosed: () => void;
  hiddenComboTileIds: ReadonlySet<number>;
  comboRevealReservedTileIds: ReadonlySet<number>;
  comboRevealPopTileIds: ReadonlySet<number>;
  libraryIntroEnterTileIds?: ReadonlySet<number>;
  libraryIntroBlocking?: boolean;
  onThumbPointerDown: (tile: Tile, ev: React.PointerEvent) => void;
  onDetailClose: () => void;
  onDetailSelectTile: (tile: Tile) => void;
  onParticleBurstComplete: (key: number) => void;
  /** Ersetzt die Puzzleteilbibliothek durch einen anderen Inhalt. */
  tileDock?: ReactNode;
  /**
   * Zeigt eine Aktion über der Bibliothek, ohne die Höhe der Ablage zu ändern.
   * Der Bibliotheksstreifen bleibt dafür unsichtbar im Layout.
   */
  tileDockActionOverlay?: ReactNode;
  /** Sanftes Einblenden der Dock-Aktion (z. B. „Zum Quiz“). */
  tileDockActionSoftEnter?: boolean;
};

export function LevelPlacingGame({
  level,
  puzzleItems,
  missionGoalDimensions,
  placementRewardBlocking,
  availableTiles,
  detailStripTiles,
  libraryStripLoading = false,
  librarySkeletonSlotCount = 4,
  letterByTileId,
  boardSceneReady,
  draggingTileId,
  placedTiles,
  currentMaxTileCount,
  levelPoints,
  barDisplayScore,
  barMaxScore,
  detailTile,
  reducedMotion,
  particleBursts,
  secondaryRewardToast,
  comboDialogOpen,
  comboDialogTile,
  onComboDialogOpenChange,
  onComboDialogClosed,
  hiddenComboTileIds,
  comboRevealReservedTileIds,
  comboRevealPopTileIds,
  libraryIntroEnterTileIds,
  libraryIntroBlocking = false,
  onThumbPointerDown,
  onDetailClose,
  onDetailSelectTile,
  onParticleBurstComplete,
  tileDock = null,
  tileDockActionOverlay = null,
  tileDockActionSoftEnter = false,
}: LevelPlacingGameProps) {
  const useCustomTileDock = tileDock != null;
  const dockActionOverlay = tileDockActionOverlay != null;
  const libraryPlacementBlocking =
    placementRewardBlocking || placedTiles.length >= currentMaxTileCount;
  const dockActionMotionClass =
    dockActionOverlay && tileDockActionSoftEnter
      ? cn(
          "level-tile-dock-action-overlay--enter",
          reducedMotion && "level-tile-dock-action-overlay--instant",
        )
      : "";
  return (
    <>
      {useCustomTileDock ? (
        tileDock
      ) : (
                <LevelTileDockInner
                  className={dockActionOverlay ? "relative min-h-0" : undefined}
                >
                  <div
                    className={
                      dockActionOverlay
                        ? cn(
                            "min-h-0 flex-1 pointer-events-none",
                            tileDockActionSoftEnter
                              ? reducedMotion
                                ? "opacity-0"
                                : "animate-level-result-library-out motion-reduce:animate-none"
                              : "invisible",
                          )
                        : "min-h-0 flex-1"
                    }
                    aria-hidden={dockActionOverlay ? true : undefined}
                  >
                    <LibraryStrip
                      id="level-tile-strip"
                      tiles={availableTiles}
                      showSkeleton={libraryStripLoading}
                      skeletonSlotCount={librarySkeletonSlotCount}
                      puzzleItems={puzzleItems}
                      sceneReady={boardSceneReady}
                      letterByTileId={letterByTileId}
                      showDebugLetters={import.meta.env.DEV}
                      draggingTileId={draggingTileId}
                      placementRewardBlocking={libraryPlacementBlocking}
                      libraryIntroBlocking={libraryIntroBlocking}
                      reducedMotion={reducedMotion}
                      hiddenComboTileIds={hiddenComboTileIds}
                      comboRevealReservedTileIds={comboRevealReservedTileIds}
                      comboRevealPopTileIds={comboRevealPopTileIds}
                      libraryIntroEnterTileIds={libraryIntroEnterTileIds}
                      onThumbPointerDown={onThumbPointerDown}
                    />
                  </div>
                  {dockActionOverlay ? (
                    <div
                      className={cn(
                        "absolute inset-0 z-10 flex items-center justify-center px-3 py-3",
                        dockActionMotionClass,
                      )}
                    >
                      {tileDockActionOverlay}
                    </div>
                  ) : null}
                </LevelTileDockInner>
      )}

      {particleBursts.map((burst) => (
        <PlacementParticleBurst
          key={burst.key}
          from={burst.from}
          to={burst.to}
          intensity={burst.intensity}
          endScatter={burst.endScatter}
          fillAbsorb={burst.fillAbsorb}
          mode={burst.mode ?? "placement"}
          relaxedFlight={burst.relaxedFlight}
          explosionSpreadPx={burst.explosionSpreadPx}
          onComplete={() => onParticleBurstComplete(burst.key)}
        />
      ))}

      {secondaryRewardToast != null && (
        <SecondaryRewardToast message={secondaryRewardToast} />
      )}

      {import.meta.env.DEV && import.meta.env.DEV_PANEL_ENABLED === "true" && (
        <DemoDeveloperPointsPanel
          level={level}
          puzzleItems={puzzleItems}
          placementMatrix={levelPoints}
          missionGoalDimensions={missionGoalDimensions}
          placedTiles={placedTiles}
          currentMaxTileCount={currentMaxTileCount}
          barDisplayScore={barDisplayScore}
          barMaxScore={barMaxScore}
        />
      )}

      <ComboUnlockDialog
        open={comboDialogOpen}
        tile={comboDialogTile}
        level={level}
        puzzleItems={puzzleItems}
        reducedMotion={reducedMotion}
        onOpenChange={onComboDialogOpenChange}
        onClosed={onComboDialogClosed}
      />

      <TileDetailPanel
        tile={detailTile}
        level={level}
        puzzleItems={puzzleItems}
        stripTiles={detailStripTiles}
        reducedMotion={reducedMotion}
        onSelectTile={onDetailSelectTile}
        onClose={onDetailClose}
      />
    </>
  );
}
