import type { Tile } from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { LevelEndAnimationSpec } from "@/features/level/mappers/levelFromConfig";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";
import { pickTransparentVideoPlaybackUrlSync } from "@/features/level/utils/videoPlaybackUrl";

/** Bewegungsschwelle, ab der eine Berührung als Ziehen oder Scrollen gilt. */
export const LIBRARY_THUMB_DRAG_THRESHOLD_PX = 14;

/**
 * Unterscheidet horizontales Scrollen vom Ziehen zum Brett.
 * Kleine vertikale Abweichungen beim Scrollen bleiben erlaubt.
 */
export function isLibraryStripScrollGesture(dx: number, dy: number): boolean {
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const t = LIBRARY_THUMB_DRAG_THRESHOLD_PX;
  if (adx < t && ady < t) {
    return false;
  }
  return adx >= t && adx > ady;
}

/** Scrollcontainer des Puzzleteilstreifens. */
function queryLevelLibraryStripScrollElement(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  return (
    document.getElementById("level-tile-strip") ??
    document.querySelector<HTMLElement>(".level-tile-strip")
  );
}

export function applyLevelLibraryStripScrollDelta(deltaX: number): void {
  const strip = queryLevelLibraryStripScrollElement();
  if (!strip || deltaX === 0) {
    return;
  }
  strip.scrollLeft -= deltaX;
}

export function buildPlacedTilesSceneFingerprint(
  placedTiles: ReadonlyArray<PlacedTile>,
): string {
  return placedTiles.map((p) => `${p.placementKey}:${p.tile.id}`).join("|");
}

export function buildBoardSceneStaticFingerprint(
  shareScreenActive: boolean,
  endAnimations: ReadonlyArray<{ webUrl: string }>,
  placementOrder: ReadonlyArray<{ kind: string; uniqueId: string }>,
): string {
  return [
    shareScreenActive ? "share" : "",
    endAnimations.map((e) => e.webUrl).join("|"),
    placementOrder.map((e) => `${e.kind}:${e.uniqueId}`).join("|"),
  ].join("|");
}

export function resolveShareVideoUrl(
  comboShareVideoUrl: string | null,
  endAnimation: LevelEndAnimationSpec | null | undefined,
): string | null {
  if (comboShareVideoUrl) {
    return comboShareVideoUrl;
  }
  if (!endAnimation) {
    return null;
  }
  const web = getLevelAssetUrl(endAnimation.webUrl.trim());
  const mov = getLevelAssetUrl(endAnimation.movUrl.trim());
  return pickTransparentVideoPlaybackUrlSync(web, mov);
}

export function placedTileIds(placedTiles: ReadonlyArray<PlacedTile>): Set<number> {
  return new Set(placedTiles.map((p) => p.tile.id));
}

export function dropTargetTiles(
  availableTiles: ReadonlyArray<Tile>,
  placedIds: ReadonlySet<number>,
): Tile[] {
  return availableTiles.filter((t) => !placedIds.has(t.id));
}
