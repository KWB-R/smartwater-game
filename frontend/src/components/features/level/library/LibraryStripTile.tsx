import { useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import {
  findPuzzleItemForTile,
  isKombiChildTile,
} from "@/features/level/logic/tilePuzzleMatch";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Tile } from "@/features/level/types";
import { TilePreviewMedia } from "./TilePreviewMedia";
import { useTilePreviewMedia } from "./useTilePreviewMedia";
import { isTileLibraryPlayable } from "@/features/level/logic/tileLibraryPlayability";
import { KombiIcon } from "@/internal_assets/icons/KombiIcon";
import { PlacementParticleBurst } from "@/components/features/level/PlacementParticleBurst";

const EMBEDDED_BURST_ORIGIN = { x: 0, y: 0 };

export type LibraryStripTileProps = {
  tile: Tile;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  sceneReady: boolean;
  letterByTileId?: Map<number, string>;
  showDebugLetters: boolean;
  draggingTileId: number | null;
  placementRewardBlocking: boolean;
  libraryIntroBlocking?: boolean;
  reducedMotion?: boolean;
  comboRevealHidden?: boolean;
  comboRevealReserved?: boolean;
  comboRevealPop?: boolean;
  libraryIntroEnter?: boolean;
  onThumbPointerDown: (tile: Tile, ev: ReactPointerEvent) => void;
};

export function LibraryStripTile({
  tile,
  puzzleItems,
  sceneReady,
  letterByTileId,
  showDebugLetters,
  draggingTileId,
  placementRewardBlocking,
  libraryIntroBlocking = false,
  reducedMotion = false,
  comboRevealHidden = false,
  comboRevealReserved = false,
  comboRevealPop = false,
  libraryIntroEnter = false,
  onThumbPointerDown,
}: LibraryStripTileProps) {
  const comboRevealPlaceholder = comboRevealReserved || comboRevealHidden;
  const displayName = useMemo(() => {
    const cms = findPuzzleItemForTile(tile, puzzleItems);
    return cms?.name ?? tile.name ?? tile.configId ?? "";
  }, [tile, puzzleItems]);

  const preview = useTilePreviewMedia(tile);
  const hasSocketTiles = Boolean(tile.socket?.length);
  const isKombiPart = isKombiChildTile(tile, puzzleItems);
  const libraryPlayable = isTileLibraryPlayable(tile);
  const placedInLibrary = tile.placed;
  const thumbCanDrag =
    !comboRevealPlaceholder &&
    sceneReady &&
    !placementRewardBlocking &&
    !libraryIntroBlocking &&
    libraryPlayable &&
    !placedInLibrary;
  const isDragging = draggingTileId === tile.id;
  const frameLetter =
    showDebugLetters && letterByTileId
      ? letterByTileId.get(tile.id)
      : undefined;

  const [stripBurstKey, setStripBurstKey] = useState(0);
  const [stripBurstActive, setStripBurstActive] = useState(false);

  useEffect(() => {
    if (!comboRevealPop || reducedMotion) {
      return;
    }
    setStripBurstKey((k) => k + 1);
    setStripBurstActive(true);
  }, [comboRevealPop, reducedMotion]);

  return (
    <div
      role="listitem"
      className={cn(
        "level-tile-strip-item flex shrink-0 flex-col items-center gap-1 touch-pan-x select-none landscape:touch-pan-y [.level-game_&]:landscape:touch-pan-x",
        libraryIntroEnter && "level-tile-strip-item--library-intro-enter",
        isDragging && "pointer-events-none cursor-grabbing opacity-55",
        comboRevealPlaceholder && "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "level-tile flex shrink-0 flex-row items-center gap-2 rounded-lg border-0 bg-white px-2.5 py-2 transition-[box-shadow] duration-150 hover:shadow-md hover:shadow-sky-500/20 active:cursor-grabbing landscape:box-border landscape:w-full",
          isDragging && "level-tile--dragging shadow-md shadow-sky-500/25",
        )}
      >
        <div
          className={cn(
            "level-tile__drag-thumb relative shrink-0 touch-none select-none rounded-md",
            !sceneReady &&
              "level-tile__drag-thumb--scene-wait pointer-events-none cursor-wait opacity-55",
            libraryIntroBlocking &&
              "level-tile__drag-thumb--intro-blocked pointer-events-none cursor-default",
            placementRewardBlocking &&
              "level-tile__drag-thumb--reward-blocked pointer-events-none cursor-wait opacity-55",
            !libraryPlayable &&
              "level-tile__drag-thumb--asset-missing pointer-events-none cursor-not-allowed opacity-45",
            placedInLibrary &&
              "level-tile__drag-thumb--placed-in-library pointer-events-none opacity-45 grayscale",
          )}
          data-strip-tile-thumb={tile.id}
          aria-disabled={!thumbCanDrag}
          onPointerDown={(e) => {
            if (!thumbCanDrag) {
              return;
            }
            onThumbPointerDown(tile, e);
          }}
          {...(hasSocketTiles
            ? {
                title: "Nach Platzierung: weitere Kacheln verfügbar",
                "aria-describedby": `tile2-socket-hint-${tile.id}`,
              }
            : {})}
        >
          {comboRevealPlaceholder ? (
            <div className="overflow-hidden rounded-md bg-white" aria-hidden>
              <div className="relative flex size-[100px] items-center justify-center">
                <div className="size-[88px] rounded-md border border-dashed border-slate-300/90 bg-white" />
              </div>
            </div>
          ) : (
            <>
              {isKombiPart && !stripBurstActive ? (
                <span
                  className="pointer-events-none absolute top-0 right-0 z-[3] size-10 translate-x-1/2 -translate-y-1/2 [&_svg]:block [&_svg]:size-full"
                  aria-hidden
                >
                  <KombiIcon />
                </span>
              ) : null}
              <div
                className={cn(
                  "level-tile__strip-thumb-clip relative size-[100px] shrink-0 overflow-hidden rounded-md bg-white",
                  comboRevealPop &&
                    "level-tile__drag-thumb--combo-reveal-enter",
                  libraryIntroEnter &&
                    "level-tile__drag-thumb--library-intro-enter",
                )}
              >
                <div className="level-tile__strip-preview-burst-host relative flex size-full items-center justify-center overflow-hidden leading-none">
                  {stripBurstActive && !reducedMotion ? (
                    <PlacementParticleBurst
                      key={stripBurstKey}
                      embedded
                      celebration
                      mode="explosion"
                      from={EMBEDDED_BURST_ORIGIN}
                      to={EMBEDDED_BURST_ORIGIN}
                      intensity={20}
                      onComplete={() => setStripBurstActive(false)}
                    />
                  ) : null}
                  <div className="relative z-[1] flex size-full items-center justify-center overflow-hidden rounded-md">
                    <TilePreviewMedia
                      preview={preview}
                      alt={displayName}
                      spriteClassName="level-tile-sprite--in-strip"
                      imageClassName="level-tile__visual-img pointer-events-none max-h-full max-w-full object-contain"
                      loadingLabel={`Vorschau ${displayName} wird geladen`}
                      showLoadingProgress
                    />
                    {frameLetter ? (
                      <span
                        className="pointer-events-none absolute left-1 top-1 z-[4] rounded bg-slate-900/80 px-1.5 py-0.5 font-display text-[0.7rem] leading-none text-white"
                        aria-hidden
                      >
                        {frameLetter}
                      </span>
                    ) : null}
                    {!libraryPlayable ? (
                      <span
                        className="pointer-events-none absolute bottom-1 left-1/2 z-[4] max-w-[92px] -translate-x-1/2 rounded bg-amber-600/95 px-1.5 py-0.5 text-center text-[0.62rem] font-medium leading-tight text-white"
                        title="Medien fehlen im Asset-Ordner"
                      >
                        Asset fehlt
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <span className="level-tile__label max-w-[100px] px-0.5 text-center leading-tight text-inherit">
        {comboRevealPlaceholder ? "\u00a0" : displayName}
      </span>
    </div>
  );
}
