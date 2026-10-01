import type { LevelPlayTutorialRect } from "@/features/level/tutorial/types";

const MIN_HIGHLIGHT_SIZE_PX = 8;

export function intersectLevelPlayTutorialRects(
  a: LevelPlayTutorialRect,
  b: LevelPlayTutorialRect,
): LevelPlayTutorialRect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  const width = right - left;
  const height = bottom - top;
  if (width < MIN_HIGHLIGHT_SIZE_PX || height < MIN_HIGHLIGHT_SIZE_PX) {
    return null;
  }
  return { left, top, width, height };
}

export function clipLevelPlayTutorialRect(
  rect: LevelPlayTutorialRect,
  clip: LevelPlayTutorialRect | null,
): LevelPlayTutorialRect | null {
  if (!clip) {
    return rect;
  }
  return intersectLevelPlayTutorialRects(rect, clip);
}

const DEFAULT_HIGHLIGHT_RING_RADIUS_REM = 2;

/** Rechnet CSS-Längen für die Abdunklung und SVG-Radien in Pixel um. */
export function levelPlayTutorialBorderRadiusPx(
  cssLength: string | undefined,
): number {
  const rootFontPx =
    typeof document !== "undefined"
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;

  if (!cssLength?.trim()) {
    return DEFAULT_HIGHLIGHT_RING_RADIUS_REM * rootFontPx;
  }

  const trimmed = cssLength.trim();
  if (trimmed.endsWith("rem")) {
    const value = parseFloat(trimmed);
    if (Number.isFinite(value)) {
      return value * rootFontPx;
    }
  }
  if (trimmed.endsWith("px")) {
    const value = parseFloat(trimmed);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return DEFAULT_HIGHLIGHT_RING_RADIUS_REM * rootFontPx;
}

export function cappedTutorialHoleRadiusPx(
  hole: LevelPlayTutorialRect,
  radiusPx: number,
): number {
  return Math.min(radiusPx, hole.width / 2, hole.height / 2);
}
