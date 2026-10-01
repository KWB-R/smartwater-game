import type { Level, Tile } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";

function normalizeConfigKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Ordnet ein CMS-Puzzleteil über uniqueId der id in config.json zu. */
export function findPuzzleItemForTile(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
): DistrictLevelPuzzleItem | null {
  const configId = tile.configId?.trim();
  if (!configId || puzzleItems.length === 0) {
    return null;
  }
  const key = normalizeConfigKey(configId);
  return (
    puzzleItems.find((item) => normalizeConfigKey(item.uniqueId) === key) ??
    null
  );
}

function kombiChildRef(
  item: DistrictLevelPuzzleItem,
): string | null {
  const raw = item.kombiChild?.trim();
  return raw && raw.length > 0 ? raw : null;
}

/** kombiChild verweist vom Ausgangsteil auf das freigeschaltete Kombiteil. */
export function hasKombiChildPuzzleLink(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
): boolean {
  const cms = findPuzzleItemForTile(tile, puzzleItems);
  return cms != null && kombiChildRef(cms) != null;
}

/** Prüft, ob dieses Puzzleteil als kombiChild eines anderen Teils eingetragen ist. */
export function isKombiChildTile(
  tile: Tile,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
): boolean {
  const configId = tile.configId?.trim();
  if (!configId) {
    return false;
  }
  const key = normalizeConfigKey(configId);
  return puzzleItems.some((item) => {
    const childId = kombiChildRef(item);
    return childId != null && normalizeConfigKey(childId) === key;
  });
}

function visitTilesInLevel(tiles: Tile[], visit: (t: Tile) => void): void {
  for (const t of tiles) {
    visit(t);
    if (t.socket?.length) {
      visitTilesInLevel(t.socket, visit);
    }
  }
}

/** Löst Spielteile über uniqueId oder configId auf, einschließlich zugehöriger Kombiteile. */
function findTilesByPuzzleUniqueId(
  level: Level,
  uniqueId: string,
): Tile[] {
  const key = normalizeConfigKey(uniqueId);
  const found: Tile[] = [];
  visitTilesInLevel(level.tiles, (t) => {
    if (t.configId && normalizeConfigKey(t.configId) === key) {
      found.push(t);
    }
  });
  return found;
}

/** Ermittelt Kombiteile aus kombiChild am platzierten Ausgangsteil. */
export function resolveKombiChildTilesForParent(
  parentTile: Tile,
  level: Level,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
): Tile[] {
  const cms = findPuzzleItemForTile(parentTile, puzzleItems);
  const childRef = cms ? kombiChildRef(cms) : null;
  if (!childRef) {
    return [];
  }
  return findTilesByPuzzleUniqueId(level, childRef);
}
