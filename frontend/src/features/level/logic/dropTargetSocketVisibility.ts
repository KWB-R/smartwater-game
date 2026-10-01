import type { Tile } from "@/features/level/types";

/** Zielgrafik nur anzeigen, solange das Teil oder sein Kombiteil noch nicht korrekt platziert ist. */
export function shouldShowDropTargetSocket(
  tile: Tile,
  placedTileIds: ReadonlySet<number>,
): boolean {
  if (!tile.helper?.image?.url) {
    return false;
  }
  if (placedTileIds.has(tile.id)) {
    return false;
  }
  if (tile.socket?.some((child) => placedTileIds.has(child.id))) {
    return false;
  }
  return true;
}
