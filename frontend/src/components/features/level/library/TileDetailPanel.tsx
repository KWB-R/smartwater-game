import { useMemo, useRef } from "react";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import type { Level, Tile } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import { ArrowIcon } from "@/internal_assets/icons/ArrowIcon";
import { TileDetailMissionList } from "@/components/features/level/library/TileDetailMissionList";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import {
  findPuzzleItemForTile,
  isKombiChildTile,
} from "@/features/level/logic/tilePuzzleMatch";
import { TilePreviewMedia } from "./TilePreviewMedia";
import { useTilePreviewMedia } from "./useTilePreviewMedia";
import { useTileDetailSheet } from "./useTileDetailSheet";
import { KombiIcon } from "@/internal_assets/icons/KombiIcon";

function resolveTileDetailPortalRoot(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const main = document.querySelector(".level-play__main");
  return main instanceof HTMLElement ? main : document.body;
}

type TileDetailPanelProps = {
  tile: Tile | null;
  level: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  stripTiles: Tile[];
  reducedMotion?: boolean;
  onSelectTile: (tile: Tile) => void;
  onClose: () => void;
};

export function TileDetailPanel({
  tile,
  level,
  puzzleItems,
  stripTiles,
  reducedMotion = false,
  onSelectTile,
  onClose,
}: TileDetailPanelProps) {
  const {
    activeTile,
    showPanel,
    sheetMotionClass,
    backdropMotionClass,
    enterTransitionMs,
    enterEaseClass,
    requestClose,
    handleSheetTransitionEnd,
  } = useTileDetailSheet({
    tile,
    reducedMotion,
    onClose,
  });

  const puzzleItem = useMemo(
    () => (activeTile ? findPuzzleItemForTile(activeTile, puzzleItems) : null),
    [activeTile, puzzleItems],
  );

  const title =
    activeTile?.name || puzzleItem?.name || activeTile?.configId || "";
  const contentBlocks = activeTile?.content ?? puzzleItem?.content ?? null;

  const navIndex = activeTile
    ? stripTiles.findIndex((t) => t.id === activeTile.id)
    : -1;
  const canLoopNav = stripTiles.length > 1 && navIndex >= 0;

  const selectAdjacentTile = (direction: "prev" | "next") => {
    if (!canLoopNav) {
      return;
    }
    const nextIndex =
      direction === "prev"
        ? navIndex <= 0
          ? stripTiles.length - 1
          : navIndex - 1
        : navIndex >= stripTiles.length - 1
          ? 0
          : navIndex + 1;
    onSelectTile(stripTiles[nextIndex]!);
  };

  const preview = useTilePreviewMedia(activeTile);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAssistiveHide(showPanel, dialogRef);

  if (!showPanel || activeTile == null) {
    return null;
  }

  const portalRoot = resolveTileDetailPortalRoot();
  if (!portalRoot) {
    return null;
  }

  const portalInLevelMain = portalRoot.classList.contains("level-play__main");

  const enterMotionStyle = {
    transitionDuration: `${enterTransitionMs}ms`,
  } as const;

  const motionWrapperClass = cn(
    "pointer-events-none flex w-full min-h-0 max-h-full flex-1 flex-col justify-end will-change-transform transition-transform motion-reduce:transition-none motion-reduce:duration-0",
    enterEaseClass,
    sheetMotionClass,
  );

  const sheet = (
    <div
      ref={dialogRef}
      className={cn(
        "pointer-events-none z-[70] flex min-h-0 flex-col justify-end overflow-hidden",
        portalInLevelMain
          ? "absolute inset-0"
          : "fixed bottom-0 left-0 right-0 top-[var(--level-mission-header-height,120px)]",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tile-detail-title"
    >
      <button
        type="button"
        className={cn(
          "pointer-events-auto absolute inset-0 border-0 bg-slate-900/45 transition-opacity motion-reduce:transition-none",
          enterEaseClass,
          backdropMotionClass,
        )}
        style={enterMotionStyle}
        aria-label="Detail schließen"
        onClick={requestClose}
      />
      <div
        className={motionWrapperClass}
        style={enterMotionStyle}
        onTransitionEnd={handleSheetTransitionEnd}
      >
        <div className="pointer-events-auto relative flex min-h-0 w-full max-h-full flex-1 flex-col bg-swg-bg">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-3">
            <div className="mb-4">
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <h2
                    id="tile-detail-title"
                    className="m-0 mb-1 font-text text-xl font-bold text-swg-black"
                  >
                    {title}
                  </h2>
                  {contentBlocks?.length ? (
                    <div className="font-text text-base leading-snug font-light text-swg-black [&_p]:m-0">
                      <StrapiBlocksView blocks={contentBlocks} />
                    </div>
                  ) : null}
                </div>
                <div className="relative shrink-0">
                  <div className="flex size-[6.5rem] items-center justify-center overflow-hidden rounded-lg bg-white">
                    <TilePreviewMedia
                      preview={preview}
                      alt={title}
                      imageAlt=""
                      spriteClassName="level-tile-sprite--in-strip max-h-full max-w-full"
                      imageClassName="max-h-full max-w-full object-contain"
                    />
                  </div>
                  {isKombiChildTile(activeTile, puzzleItems) ? (
                    <span
                      className="pointer-events-none absolute top-0 right-0 z-[1] size-9 translate-x-1/4 -translate-y-1/4 [&_svg]:size-full"
                      aria-hidden
                    >
                      <KombiIcon />
                    </span>
                  ) : null}
                </div>
              </div>

              <hr className="mb-4 mt-4 border-0 border-t border-swg-black/15" />

              <TileDetailMissionList
                tile={activeTile}
                level={level}
                tilePunkte={puzzleItem?.punkte ?? null}
                levelPuzzleItems={puzzleItems}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>

          <footer className="flex shrink-0 items-center gap-3 border-t border-swg-black/10 bg-swg-bg px-4 py-[0.85rem] pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))]">
            <Button
              shape="roundIcon"
              className="disabled:opacity-40"
              aria-label="Vorheriges Teil"
              disabled={!canLoopNav}
              onClick={() => selectAdjacentTile("prev")}
            >
              <ArrowIcon />
            </Button>
            <Button grow onClick={requestClose}>
              schließen
            </Button>
            <Button
              shape="roundIcon"
              className="disabled:opacity-40 [&_svg]:rotate-180"
              aria-label="Nächstes Teil"
              disabled={!canLoopNav}
              onClick={() => selectAdjacentTile("next")}
            >
              <ArrowIcon />
            </Button>
          </footer>
        </div>
      </div>
    </div>
  );

  return <OverlayPortal container={portalRoot}>{sheet}</OverlayPortal>;
}
