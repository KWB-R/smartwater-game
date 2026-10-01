import type { Tile, Vector2 } from "@/features/level/types";

export type PlacedTile = {
  /** Eindeutiger React-Schlüssel auch bei wiederholten Zustandsaktualisierungen. */
  placementKey: string;
  tile: Tile;
  position: Vector2;
  /** Intro-Video nicht erneut abspielen (bereits gelegt / Session-Restore). */
  skipPlacementVideoIntro?: boolean;
};

/**
 * Prüft die Ablageposition im Zielrechteck aus helper oder dem Puzzleteil.
 * Die Koordinaten verwenden Referenzpixel; tolerancePx erweitert den gültigen Bereich.
 */
export function isPlacementValid(
  tile: Tile,
  dropRefX: number,
  dropRefY: number,
  tolerancePx: number
): boolean {
  const pos = tile.helper?.position ?? tile.position;
  const size = tile.helper?.size ?? tile.size;
  const pad = tolerancePx;
  return (
    dropRefX >= pos.x - pad &&
    dropRefX <= pos.x + size.x + pad &&
    dropRefY >= pos.y - pad &&
    dropRefY <= pos.y + size.y + pad
  );
}

