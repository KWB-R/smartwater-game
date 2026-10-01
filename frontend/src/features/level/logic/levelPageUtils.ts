import type { Level, Tile } from "@/features/level/types";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import {
  isKombiChildTile,
  resolveKombiChildTilesForParent,
} from "@/features/level/logic/tilePuzzleMatch";
import type { PlacedTile } from "@/features/level/logic/levelState";

function configKey(value: string): string {
  return value.trim().toLowerCase();
}

/** Ordnet die Bibliothek nach der Reihenfolge der CMS-Puzzleteile. */
export function orderTilesForLibraryStrip(
  tiles: Tile[],
  puzzleItems: ReadonlyArray<{ uniqueId: string }>,
): Tile[] {
  if (puzzleItems.length === 0) {
    return tiles;
  }
  const byConfigId = new Map<string, Tile>();
  for (const tile of tiles) {
    if (tile.configId) {
      byConfigId.set(configKey(tile.configId), tile);
    }
  }
  const ordered: Tile[] = [];
  const usedIds = new Set<number>();
  for (const item of puzzleItems) {
    const tile = byConfigId.get(configKey(item.uniqueId));
    if (tile && !usedIds.has(tile.id)) {
      ordered.push(tile);
      usedIds.add(tile.id);
    }
  }
  for (const tile of tiles) {
    if (!usedIds.has(tile.id)) {
      ordered.push(tile);
    }
  }
  return ordered;
}

export function getInitialAvailableTiles(
  level: Level,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem> = [],
): Tile[] {
  const tiles = level.tiles.map((t) => ({ ...t, placed: false }));
  const stripRoots =
    puzzleItems.length > 0
      ? tiles.filter((t) => !isKombiChildTile(t, puzzleItems))
      : tiles;
  return orderTilesForLibraryStrip(stripRoots, puzzleItems);
}

/** Kombiteile, deren zugehöriges Ausgangsteil bereits platziert ist. */
/** Bibliotheksinhalt nach Platzierungen, CMS-Aktualisierung oder Wiederherstellung der Sitzung. */
export function buildAvailableTilesForLibrary(
  _prev: Tile[],
  level: Level,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  placed: ReadonlyArray<PlacedTile>,
  pendingKombiIds: ReadonlySet<number> = new Set(),
): Tile[] {
  const placedIds = new Set(placed.map((p) => p.tile.id));
  const base =
    puzzleItems.length > 0
      ? getInitialAvailableTiles(level, puzzleItems)
      : getInitialAvailableTiles(level, []);
  const baseMarked = base.map((t) => ({
    ...t,
    placed: placedIds.has(t.id),
  }));
  const baseIds = new Set(baseMarked.map((t) => t.id));
  const fromPlacedParents = kombiTilesUnlockedByPlacedParents(
    level,
    puzzleItems,
    placed,
  ).filter((t) => !baseIds.has(t.id) && !pendingKombiIds.has(t.id));
  const stripIds = new Set([
    ...baseMarked.map((t) => t.id),
    ...fromPlacedParents.map((t) => t.id),
  ]);
  /** Platzierte Kombiteile bleiben für die Detailnavigation im Streifen. */
  const placedKombiChildren: Tile[] = [];
  for (const { tile } of placed) {
    if (!isKombiChildTile(tile, puzzleItems) || stripIds.has(tile.id)) {
      continue;
    }
    const levelTile = findTileById(level, tile.id) ?? tile;
    placedKombiChildren.push({ ...levelTile, placed: true });
    stripIds.add(tile.id);
  }
  return orderTilesForLibraryStrip(
    [...baseMarked, ...fromPlacedParents, ...placedKombiChildren],
    puzzleItems,
  );
}

/** Den Kombihinweis nur zeigen, wenn anschließend noch ein freier Platz auf dem Brett bleibt. */
export function shouldShowKombiUnlockOverlayAfterPlacement(options: {
  placedCountBefore: number;
  currentMaxTileCount: number;
  levelMaximumTileCount: number;
  hasKombiChildLink: boolean;
}): boolean {
  if (!options.hasKombiChildLink) {
    return false;
  }
  const countAfter = options.placedCountBefore + 1;
  const maxAfter = Math.min(
    options.levelMaximumTileCount,
    options.currentMaxTileCount + 1,
  );
  return countAfter < maxAfter;
}

export function kombiTilesUnlockedByPlacedParents(
  level: Level,
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>,
  placed: ReadonlyArray<PlacedTile>,
): Tile[] {
  if (puzzleItems.length === 0 || placed.length === 0) {
    return [];
  }
  const placedIds = new Set(placed.map((p) => p.tile.id));
  const seen = new Set<number>();
  const out: Tile[] = [];
  for (const { tile: parent } of placed) {
    for (const child of resolveKombiChildTilesForParent(
      parent,
      level,
      puzzleItems,
    )) {
      if (placedIds.has(child.id) || seen.has(child.id)) {
        continue;
      }
      seen.add(child.id);
      out.push({ ...child, placed: false });
    }
  }
  return out;
}

export function buildLetterByTileId(tiles: Tile[]): Map<number, string> {
  const sorted = [...tiles].sort((a, b) => {
    const pa = a.helper?.position ?? a.position;
    const pb = b.helper?.position ?? b.position;
    if (pa.y !== pb.y) return pa.y - pb.y;
    return pa.x - pb.x;
  });
  const map = new Map<number, string>();
  sorted.forEach((t, i) => {
    map.set(t.id, String.fromCharCode(65 + (i % 26)));
  });
  return map;
}

function queryStripTileThumb(tileId: number): Element | null {
  if (typeof document === "undefined") {
    return null;
  }
  return document.querySelector(`[data-strip-tile-thumb="${tileId}"]`);
}

function queryLibraryTileStripScrollElement(
  tileId: number,
): Element | null {
  const thumb = queryStripTileThumb(tileId);
  return thumb?.closest(".level-tile-strip") ?? null;
}

/** Kurze Pause nach Scroll-Ende, dann Tutorial. */
const LIBRARY_INTRO_SCROLL_END_BUFFER_MS = 140;
const LIBRARY_INTRO_SCROLL_SETTLE_FALLBACK_MS = 880;

/**
 * Scrollt zur Puzzleteilvorschau und ruft onSettled nach dem Scrollende samt kurzer Pause auf.
 * Ein Timer übernimmt, falls scrollend nicht ausgelöst wird.
 */
export function runAfterLibraryStripScrollSettled(
  tileId: number,
  behavior: ScrollBehavior,
  onSettled: () => void,
): () => void {
  let done = false;
  let fallbackTimer: number | null = null;
  let bufferTimer: number | null = null;
  let scrollEl: Element | null = null;

  const cleanup = () => {
    if (fallbackTimer != null) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (bufferTimer != null) {
      window.clearTimeout(bufferTimer);
      bufferTimer = null;
    }
    if (scrollEl) {
      scrollEl.removeEventListener("scrollend", onScrollEnd);
      scrollEl = null;
    }
  };

  const finish = () => {
    if (done) {
      return;
    }
    done = true;
    cleanup();
    bufferTimer = window.setTimeout(() => {
      bufferTimer = null;
      onSettled();
    }, LIBRARY_INTRO_SCROLL_END_BUFFER_MS);
  };

  const onScrollEnd = () => {
    finish();
  };

  const start = () => {
    scrollLibraryStripToTile(tileId, { behavior });
    scrollEl = queryLibraryTileStripScrollElement(tileId);
    if (scrollEl) {
      scrollEl.addEventListener("scrollend", onScrollEnd, { once: true });
    }
    fallbackTimer = window.setTimeout(() => {
      fallbackTimer = null;
      finish();
    }, LIBRARY_INTRO_SCROLL_SETTLE_FALLBACK_MS);
  };

  if (typeof window === "undefined") {
    return () => {};
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(start);
  });

  return cleanup;
}

/** Scrollt den Bibliotheksstreifen zum sichtbaren Kombiteil. */
function scrollLibraryStripToTile(
  tileId: number,
  options?: { behavior?: ScrollBehavior },
): void {
  const thumb = queryStripTileThumb(tileId);
  if (!thumb) {
    return;
  }
  const strip = thumb.closest(".level-tile-strip");
  if (!(strip instanceof HTMLElement)) {
    return;
  }
  const behavior = options?.behavior ?? "smooth";
  const stripRect = strip.getBoundingClientRect();
  const thumbRect = thumb.getBoundingClientRect();
  const thumbCenter = thumbRect.left + thumbRect.width / 2;
  const stripCenter = stripRect.left + stripRect.width / 2;
  strip.scrollBy({ left: thumbCenter - stripCenter, behavior });
}

export function scheduleScrollLibraryStripToTile(
  tileId: number,
  behavior: ScrollBehavior = "smooth",
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollLibraryStripToTile(tileId, { behavior });
    });
  });
}

export function findTileById(level: Level, tileId: number): Tile | undefined {
  for (const t of level.tiles) {
    if (t.id === tileId) {
      return t;
    }
    if (t.socket) {
      const nested = t.socket.find((s) => s.id === tileId);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}
