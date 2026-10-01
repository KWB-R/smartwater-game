import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useRef } from "react";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Tile } from "@/features/level/types";
import { LibraryStripTile } from "./LibraryStripTile";
import { LibraryStripSkeleton } from "./LibraryStripSkeleton";
import { libraryStripContainerClassName } from "./libraryStripContainerClassName";
import { applyHorizontalScrollKeyDown } from "./horizontalScrollRegionKeyboard";

export type LibraryStripProps = {
  id?: string;
  tiles: Tile[];
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  /** false, solange die Pixi-Szene noch nicht bereit ist, etwa nach einem Vite-Neuladen. */
  sceneReady: boolean;
  letterByTileId?: Map<number, string>;
  showDebugLetters?: boolean;
  draggingTileId: number | null;
  placementRewardBlocking: boolean;
  libraryIntroBlocking?: boolean;
  reducedMotion?: boolean;
  hiddenComboTileIds?: ReadonlySet<number>;
  comboRevealReservedTileIds?: ReadonlySet<number>;
  comboRevealPopTileIds?: ReadonlySet<number>;
  libraryIntroEnterTileIds?: ReadonlySet<number>;
  onThumbPointerDown: (tile: Tile, ev: ReactPointerEvent) => void;
  /** Platzhalter, solange noch keine Puzzleteile geladen sind. */
  showSkeleton?: boolean;
  skeletonSlotCount?: number;
};

export function LibraryStrip({
  id,
  tiles,
  puzzleItems,
  sceneReady,
  letterByTileId,
  showDebugLetters = false,
  draggingTileId,
  placementRewardBlocking,
  libraryIntroBlocking = false,
  reducedMotion = false,
  hiddenComboTileIds,
  comboRevealReservedTileIds,
  comboRevealPopTileIds,
  libraryIntroEnterTileIds,
  onThumbPointerDown,
  showSkeleton = false,
  skeletonSlotCount = 4,
}: LibraryStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);

  const onStripKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const el = stripRef.current;
      if (!el) {
        return;
      }
      applyHorizontalScrollKeyDown(event, el, { reducedMotion });
    },
    [reducedMotion],
  );

  if (tiles.length === 0 && showSkeleton) {
    return <LibraryStripSkeleton id={id} slotCount={skeletonSlotCount} />;
  }

  if (tiles.length === 0) {
    return (
      <div
        id={id}
        className={libraryStripContainerClassName(
          "level-tile-strip--empty items-center justify-center",
        )}
        role="status"
      >
        <p className="m-0 text-center text-sm text-slate-500">
          Keine Puzzleteile mehr verfügbar.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={stripRef}
      id={id}
      tabIndex={0}
      className={libraryStripContainerClassName(
        !sceneReady ? "level-tile-strip--scene-loading" : "",
      )}
      role="list"
      aria-label="Puzzleteile — mit Pfeiltasten scrollen"
      aria-busy={!sceneReady}
      onKeyDown={onStripKeyDown}
    >
      {tiles.map((tile) => (
        <LibraryStripTile
          key={tile.id}
          tile={tile}
          puzzleItems={puzzleItems}
          sceneReady={sceneReady}
          letterByTileId={letterByTileId}
          showDebugLetters={showDebugLetters}
          draggingTileId={draggingTileId}
          placementRewardBlocking={placementRewardBlocking}
          libraryIntroBlocking={libraryIntroBlocking}
          reducedMotion={reducedMotion}
          comboRevealHidden={hiddenComboTileIds?.has(tile.id) ?? false}
          comboRevealReserved={
            comboRevealReservedTileIds?.has(tile.id) ?? false
          }
          comboRevealPop={comboRevealPopTileIds?.has(tile.id) ?? false}
          libraryIntroEnter={libraryIntroEnterTileIds?.has(tile.id) ?? false}
          onThumbPointerDown={onThumbPointerDown}
        />
      ))}
    </div>
  );
}
