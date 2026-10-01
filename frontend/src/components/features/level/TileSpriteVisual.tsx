import { useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import type { CSSProperties } from "react";
import type { Spritesheet } from "@/features/level/types";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";

/** Vorschau in einer festen Box von 100 × 100 Pixeln. */
const STRIP_PREVIEW_MAX = "100px";

export type TileSpriteVisualProps = {
  spritesheet: Spritesheet;
  /** strip zeigt das erste Bild für Bibliothek und Ziehen; placed spielt die Brettanimation ab. */
  mode: "strip" | "placed";
  alt: string;
  className?: string;
  /** Verwendet nach dem Laden die Blob-URL, sonst die Spritesheet-URL. */
  resolvedAssetUrl?: string;
};

export function getSpriteGridRows(s: Spritesheet): number {
  if (s.gridRows != null && s.gridRows > 0) return s.gridRows;
  return Math.max(1, Math.ceil(s.frameCount / s.gridColumns));
}

function animationDurationMs(s: Spritesheet): number {
  if (s.frameRate > 0) {
    return (s.frameCount / s.frameRate) * 1000;
  }
  if (s.frameDuration > 0) {
    return s.frameCount * s.frameDuration;
  }
  return Math.max(500, s.frameCount * 50);
}

/** Berechnet die CSS-Hintergrundgröße aus Spalten und Zeilen; die Position wählt die Rasterzelle. */
export function frameIndexToBackgroundPercent(
  frameIndex: number,
  cols: number,
  rows: number,
): { x: number; y: number } {
  const c = frameIndex % cols;
  const r = Math.floor(frameIndex / cols);
  const xPct = cols <= 1 ? 0 : (c / (cols - 1)) * 100;
  const yPct = rows <= 1 ? 0 : (r / (rows - 1)) * 100;
  return { x: xPct, y: yPct };
}

export function TileSpriteVisual({
  spritesheet,
  mode,
  alt,
  className = "",
  resolvedAssetUrl,
}: TileSpriteVisualProps) {
  const url = resolvedAssetUrl ?? getLevelAssetUrl(spritesheet.url);
  const cols = Math.max(1, spritesheet.gridColumns);
  const rows = getSpriteGridRows(spritesheet);
  const n = spritesheet.frameCount;

  const bgSize = useMemo(() => `${cols * 100}% ${rows * 100}%`, [cols, rows]);

  const [animFrame, setAnimFrame] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  const loopMs = useMemo(
    () => animationDurationMs(spritesheet),
    [
      spritesheet.frameCount,
      spritesheet.frameRate,
      spritesheet.frameDuration,
    ],
  );

  useEffect(() => {
    if (mode !== "placed" || reducedMotion) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) % loopMs;
      const fi = Math.min(
        n - 1,
        Math.floor((elapsed / loopMs) * n),
      );
      setAnimFrame(fi);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, reducedMotion, n, loopMs]);

  const stripFrameIndex = 0;
  const reducedMotionPlacedFrameIndex = n - 1;
  const frameIndex =
    mode === "strip"
      ? stripFrameIndex
      : reducedMotion
        ? reducedMotionPlacedFrameIndex
        : animFrame;

  const { x, y } = frameIndexToBackgroundPercent(
    Math.min(frameIndex, n - 1),
    cols,
    rows,
  );

  const aspectRatio = `${spritesheet.frameSize.x} / ${spritesheet.frameSize.y}`;
  const isStripLibrary = className.includes("level-tile-sprite--in-strip");
  /** Die schwebende Vorschau benötigt wie das Brett eine feste Bezugsgröße. */
  const isDragFloat = className.includes("level-tile-sprite--in-float");
  /** Auf dem Brett proportional in den Container einpassen, damit das Raster nicht verzerrt wird. */
  const isOnBoard = className.includes("level-tile-sprite--on-board");
  const fw = spritesheet.frameSize.x;
  const fh = spritesheet.frameSize.y;

  /** Ein leeres Sprite-Element braucht feste Maße; aspect-ratio allein reicht im Flex-Layout nicht. */
  const stripLibrarySize: CSSProperties | undefined = isStripLibrary
    ? {
        maxWidth: STRIP_PREVIEW_MAX,
        maxHeight: STRIP_PREVIEW_MAX,
        width: "auto",
        height: "auto",
      }
    : undefined;

  /**
   * Die Elternbox gibt die Brettgröße vor.
   * Ohne eine feste Achse kann ein leeres Sprite-Element trotz aspect-ratio auf Größe null schrumpfen.
   */
  const placedBoardSize: CSSProperties | undefined =
    mode === "placed" && !isStripLibrary && !isOnBoard
      ? fw >= fh
        ? {
            height: "100%",
            maxWidth: "100%",
            width: "auto",
            minWidth: 0,
            minHeight: 0,
          }
        : {
            width: "100%",
            maxHeight: "100%",
            height: "auto",
            minWidth: 0,
            minHeight: 0,
          }
      : undefined;

  /** Bezugscontainer für die Größenberechnung in levelGame.scss. */
  const onBoardSizeVars: CSSProperties | undefined =
    mode === "placed" && isOnBoard
      ? ({
          ["--level-sprite-fw" as string]: String(fw),
          ["--level-sprite-fh" as string]: String(fh),
        } as CSSProperties)
      : undefined;

  /** Die Ziehvorschau braucht eine feste Box, da ein leeres div keine eigene Bildgröße hat. */
  const floatDragSize: CSSProperties | undefined =
    mode === "strip" && isDragFloat
      ? fw >= fh
        ? {
            height: "100%",
            maxWidth: "100%",
            width: "auto",
            minWidth: 0,
            minHeight: 0,
          }
        : {
            width: "100%",
            maxHeight: "100%",
            height: "auto",
            minWidth: 0,
            minHeight: 0,
          }
      : undefined;

  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "level-tile-sprite",
        mode === "placed"
          ? "level-tile-sprite--placed"
          : "level-tile-sprite--strip",
        className,
      )}
      style={{
        aspectRatio,
        ...stripLibrarySize,
        ...placedBoardSize,
        ...onBoardSizeVars,
        ...floatDragSize,
        backgroundImage: `url("${url}")`,
        backgroundRepeat: "no-repeat",
        backgroundSize: bgSize,
        backgroundPosition: `${x}% ${y}%`,
      }}
    />
  );
}
