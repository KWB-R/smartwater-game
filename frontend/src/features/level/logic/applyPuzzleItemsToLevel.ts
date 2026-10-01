import { pointMatrixFromPunkte } from "@/features/level/logic/punkteToPointMatrix";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Level, Tile } from "@/features/level/types";

function normalizeConfigKey(value: string): string {
  return value.trim().toLowerCase();
}

function mapTile(
  tile: Tile,
  byUniqueId: Map<string, DistrictLevelPuzzleItem>,
): Tile {
  const configId = tile.configId?.trim();
  if (!configId) {
    return tile.socket?.length
      ? {
          ...tile,
          socket: tile.socket.map((child) => mapTile(child, byUniqueId)),
        }
      : tile;
  }
  const key = normalizeConfigKey(configId);
  const cms = byUniqueId.get(key);
  let next: Tile = tile;
  if (cms) {
    next = {
      ...tile,
      name: cms.name,
      content: cms.content,
      pointMatrix: pointMatrixFromPunkte(cms.punkte),
    };
  }
  if (next.socket?.length) {
    next = {
      ...next,
      socket: next.socket.map((child) => mapTile(child, byUniqueId)),
    };
  }
  return next;
}

/** Übernimmt Titel, Inhalt und Punkte aus dem CMS anhand von uniqueId und der id in config.json. */
export function applyPuzzleItemsToLevel(
  level: Level,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
): Level {
  if (puzzleItems.length === 0) {
    return level;
  }
  const byUniqueId = new Map(
    puzzleItems.map((item) => [normalizeConfigKey(item.uniqueId), item]),
  );
  return {
    ...level,
    tiles: level.tiles.map((tile) => mapTile(tile, byUniqueId)),
  };
}
