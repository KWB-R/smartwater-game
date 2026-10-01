import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  OverlayBackdrop,
  OverlayCenterLayer,
  OverlayPortal,
} from "@/components/ui/OverlayPortal";
import { Button } from "@/components/ui/Button";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Level, Tile } from "@/features/level/types";
import { findPuzzleItemForTile } from "@/features/level/logic/tilePuzzleMatch";
import { findTileById } from "@/features/level/logic/levelPageUtils";
import {
  getLevelAssetUrl,
  getTileLibraryPreviewMedia,
} from "@/features/level/services/levelAssetUrls";
import { isSheet } from "@/components/features/level/scene/pixi/tileTextures";
import { TileSpriteVisual } from "@/components/features/level/TileSpriteVisual";
import { useTilePreviewAsset } from "@/components/features/level/library/useTilePreviewAsset";
import { PlacementParticleBurst } from "@/components/features/level/PlacementParticleBurst";
import { KombiIcon } from "@/internal_assets/icons/KombiIcon";
import { getComboDialogAutoCloseMs } from "@/features/level/logic/devCelebrationOverlays";
import { useMainMenu } from "@/components/layout/mainMenuContext";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";
import { CelebrationRays } from "@/components/ui/CelebrationRays";

const EMBEDDED_BURST_ORIGIN = { x: 0, y: 0 };
/** Die Einblendung abwarten, bevor die Partikel über der Vorschau starten. */
const COMBO_BURST_AFTER_OPEN_MS = 520;

type ComboUnlockDialogProps = {
  open: boolean;
  tile: Tile | null;
  level: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  reducedMotion?: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed?: () => void;
};

function formatTileLabel(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
): string {
  const cms = findPuzzleItemForTile(tile, puzzleItems);
  const fromTile = tile.name?.trim();
  if (fromTile) {
    return fromTile;
  }
  const fromCms = cms?.name?.trim();
  if (fromCms) {
    return fromCms;
  }
  const configId = tile.configId?.trim();
  if (configId) {
    return configId.replace(/_/g, " ");
  }
  return "Neues Teil";
}

export function ComboUnlockDialog({
  open,
  tile,
  level,
  puzzleItems,
  reducedMotion = false,
  onOpenChange,
  onClosed,
}: ComboUnlockDialogProps) {
  const { isOpen: mainMenuOpen } = useMainMenu();
  const modalLayerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);
  const [enterGeneration, setEnterGeneration] = useState(0);
  /** Partikeleffekt über der Vorschau nach dem Öffnen. */
  const [burstActive, setBurstActive] = useState(false);
  const visible = open && !mainMenuOpen;
  useModalAssistiveHide(visible, modalLayerRef);

  const resolvedTile = useMemo(() => {
    if (!tile) {
      return null;
    }
    return findTileById(level, tile.id) ?? tile;
  }, [tile, level]);

  const displayName = useMemo(
    () => (resolvedTile ? formatTileLabel(resolvedTile, puzzleItems) : ""),
    [resolvedTile, puzzleItems],
  );

  const previewMedia = resolvedTile
    ? getTileLibraryPreviewMedia(resolvedTile)
    : null;
  const imgSrc = previewMedia ? getLevelAssetUrl(previewMedia.url) : "";
  const asset = useTilePreviewAsset(resolvedTile ? imgSrc : "");
  const sprite = previewMedia && isSheet(previewMedia) ? previewMedia : null;
  const previewUrl =
    asset.blobUrl ?? (asset.error && imgSrc ? imgSrc : undefined);

  useEffect(() => {
    if (visible && !wasOpenRef.current) {
      setEnterGeneration((g) => g + 1);
      setBurstActive(false);
      queueMicrotask(() => dialogRef.current?.focus());
    }
    if (!visible) {
      setBurstActive(false);
    }
    wasOpenRef.current = visible;
  }, [visible]);

  useEffect(() => {
    if (!visible || reducedMotion) {
      return;
    }
    const timer = window.setTimeout(() => {
      setBurstActive(true);
    }, COMBO_BURST_AFTER_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, [visible, enterGeneration, reducedMotion]);

  const closeDialog = useCallback(() => {
    if (!open) {
      return;
    }
    onOpenChange(false);
    onClosed?.();
  }, [open, onClosed, onOpenChange]);

  useEffect(() => {
    const autoCloseMs = getComboDialogAutoCloseMs();
    if (!open || autoCloseMs == null) {
      return;
    }
    const id = window.setTimeout(() => {
      closeDialog();
    }, autoCloseMs);
    return () => window.clearTimeout(id);
  }, [open, closeDialog]);

  const previewVisual =
    resolvedTile && previewUrl ? (
      sprite ? (
        <TileSpriteVisual
          spritesheet={sprite}
          mode="strip"
          alt={displayName}
          className="level-tile-sprite--in-strip max-h-full max-w-full"
          resolvedAssetUrl={previewUrl}
        />
      ) : (
        <img
          src={previewUrl}
          alt={displayName}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      )
    ) : (
      <div
        className="size-full rounded-md bg-linear-to-br from-slate-300/50 to-slate-100/80"
        aria-hidden
      />
    );

  return (
    <OverlayPortal>
      {visible ? (
        <div ref={modalLayerRef} className="fixed inset-0 z-(--z-overlay)">
          <OverlayBackdrop />
          <OverlayCenterLayer>
            <div
              ref={dialogRef}
            className="combo-unlock-dialog pointer-events-auto w-[min(100%-2rem,20.5rem)] max-w-[20.5rem] overflow-visible border-0 bg-transparent p-0 shadow-none outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="combo-unlock-dialog-title"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeDialog();
              }
            }}
          >
            <div key={enterGeneration} className="relative isolate">
              <div className="relative z-10">
                <span
                  className="pointer-events-none absolute top-0 right-0 z-30 size-[4.25rem] translate-x-1/4 -translate-y-1/4 [&_svg]:block [&_svg]:size-full"
                  aria-hidden
                >
                  <KombiIcon />
                </span>
                <div
                  className={cn(
                    "combo-unlock-dialog__panel relative overflow-hidden rounded-2xl bg-white",
                    reducedMotion && "combo-unlock-dialog__panel--instant",
                  )}
                >
                  <div className="combo-unlock-dialog__hero relative z-10 pt-5 pb-0">
                    <div className="relative z-10 flex flex-col items-center px-5">
                      <div className="relative">
                        <div
                          className="combo-unlock-dialog__rays"
                          aria-hidden
                        >
                          <CelebrationRays reducedMotion={reducedMotion} />
                        </div>
                        <div className="combo-unlock-dialog__preview relative z-10 flex aspect-square w-[10rem] shrink-0 flex-col gap-2 overflow-hidden rounded-md bg-white p-3">
                          <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
                            {burstActive ? (
                              <div
                                className="combo-unlock-dialog__burst-host pointer-events-none absolute inset-0 z-20 overflow-hidden"
                                aria-hidden
                              >
                                <PlacementParticleBurst
                                  key={`combo-burst-${enterGeneration}`}
                                  embedded
                                  celebration
                                  mode="explosion"
                                  from={EMBEDDED_BURST_ORIGIN}
                                  to={EMBEDDED_BURST_ORIGIN}
                                  intensity={20}
                                  explosionSpreadPx={72}
                                  onComplete={() => setBurstActive(false)}
                                />
                              </div>
                            ) : null}
                            <div className="relative z-10 flex size-full items-center justify-center overflow-hidden">
                              {previewVisual}
                            </div>
                          </div>

                          {displayName ? (
                            <p className="relative z-20 m-0 shrink-0 pt-1 text-center text-[0.8rem] leading-tight text-swg-black">
                              {displayName}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 px-5 pt-5 pb-5">
                    <h2
                      id="combo-unlock-dialog-title"
                      className="m-0 mb-4 text-center font-text text-[1.3rem] font-bold leading-tight tracking-wide text-swg-black"
                    >
                      Neues Kombi-Puzzlestück freigespielt!
                    </h2>
                    <Button block onClick={closeDialog}>
                      Alles klar!
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </OverlayCenterLayer>
        </div>
      ) : null}
    </OverlayPortal>
  );
}
