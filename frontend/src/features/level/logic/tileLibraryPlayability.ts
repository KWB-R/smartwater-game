import type { Tile } from "@/features/level/types";

export function isTileLibraryPlayable(tile: Tile): boolean {
  return tile.libraryDisabled !== true;
}
