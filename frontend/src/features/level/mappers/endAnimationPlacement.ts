import type { LevelEndAnimationSpec } from "@/features/level/mappers/levelFromConfig";
import { emptyPoints } from "@/features/level/logic/points";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Tile, TilePlacementVideo } from "@/features/level/types";
import type { LevelPlacementOrderEntry } from "@/types/content";
import type { StrapiMedia } from "@/types/strapi";

const END_ANIMATION_TILE_ID_BASE = 900_001;

function configKey(value: string): string {
  return value.trim().toLowerCase();
}

function endMedia(id: number, url: string): StrapiMedia {
  return { id, url };
}

/** Verwendet dieselbe Medienstruktur wie buildPlacementVideo mit getrennten WebM- und MOV-Varianten. */
function endAnimationPlacementVideo(
  spec: LevelEndAnimationSpec,
  mediaIdBase: number,
): TilePlacementVideo {
  const loopWeb = endMedia(mediaIdBase + 12, spec.webUrl);
  const loopMov = endMedia(mediaIdBase + 13, spec.movUrl);
  return {
    preview: endMedia(mediaIdBase + 14, spec.webUrl),
    loop: {
      web: loopWeb,
      mov: loopMov,
      renderPosition: spec.position,
      renderSize: spec.size,
      ...(spec.playbackRate !== undefined
        ? { playbackRate: spec.playbackRate }
        : {}),
    },
    renderPosition: spec.position,
    renderSize: spec.size,
  };
}

/** Erzeugt für die Endanimation ein künstliches Puzzleteil aus dem konfigurierten Rechteck. */
function buildEndAnimationPlacementTile(
  spec: LevelEndAnimationSpec,
  tileId: number,
): Tile {
  const pv = endAnimationPlacementVideo(spec, tileId * 10);
  return {
    id: tileId,
    configId: spec.configId,
    name: "Endanimation",
    content: null,
    image: pv.preview,
    position: spec.position,
    size: spec.size,
    placed: true,
    helper: null,
    socket: null,
    placementVideo: pv,
    measureEffective: false,
    pointMatrix: emptyPoints(),
  };
}

/** Bindet die Endanimation über denselben Medienablauf wie platzierte Puzzleteile ein. */
function buildEndAnimationPlacedTile(
  spec: LevelEndAnimationSpec,
  tileId: number,
): PlacedTile {
  const tile = buildEndAnimationPlacementTile(spec, tileId);
  return {
    placementKey: `end-animation:${spec.configId}`,
    tile,
    position: { x: tile.position.x, y: tile.position.y },
  };
}

function indexPlacedByConfigId(
  placed: ReadonlyArray<PlacedTile>,
): Map<string, PlacedTile> {
  const map = new Map<string, PlacedTile>();
  for (const entry of placed) {
    const id = entry.tile.configId;
    if (id) {
      map.set(configKey(id), entry);
    }
  }
  return map;
}

function indexEndAnimationsByConfigId(
  endAnimations: ReadonlyArray<LevelEndAnimationSpec>,
): Map<string, LevelEndAnimationSpec> {
  const map = new Map<string, LevelEndAnimationSpec>();
  for (const spec of endAnimations) {
    map.set(configKey(spec.configId), spec);
  }
  return map;
}

/**
 * Die CMS-Reihenfolge bestimmt die Pixi-Ebenen: frühere Einträge werden zuerst und weiter unten gezeichnet.
 */
export function placedTilesInCmsOrder(
  placed: ReadonlyArray<PlacedTile>,
  placementOrder: ReadonlyArray<LevelPlacementOrderEntry>,
): PlacedTile[] {
  if (placementOrder.length === 0) {
    return [...placed];
  }

  const placedByConfig = indexPlacedByConfigId(placed);
  const usedPlacedKeys = new Set<string>();
  const ordered: PlacedTile[] = [];

  for (const entry of placementOrder) {
    if (entry.kind !== "puzzle") {
      continue;
    }
    const key = configKey(entry.uniqueId);
    const match = placedByConfig.get(key);
    if (match && !usedPlacedKeys.has(key)) {
      ordered.push(match);
      usedPlacedKeys.add(key);
    }
  }

  for (const p of placed) {
    const key = p.tile.configId ? configKey(p.tile.configId) : "";
    if (!key || usedPlacedKeys.has(key)) {
      continue;
    }
    ordered.push(p);
    usedPlacedKeys.add(key);
  }

  return ordered;
}

function appendUnorderedEndAnimations(
  ordered: PlacedTile[],
  endAnimations: ReadonlyArray<LevelEndAnimationSpec>,
  usedConfigKeys: Set<string>,
): PlacedTile[] {
  let nextTileId = END_ANIMATION_TILE_ID_BASE;
  const out = [...ordered];
  for (const spec of endAnimations) {
    const key = configKey(spec.configId);
    if (usedConfigKeys.has(key)) {
      continue;
    }
    out.push(buildEndAnimationPlacedTile(spec, nextTileId));
    nextTileId += 1;
    usedConfigKeys.add(key);
  }
  return out;
}

export function placedTilesWithEndAnimation(
  placed: ReadonlyArray<PlacedTile>,
  endAnimations: ReadonlyArray<LevelEndAnimationSpec>,
  placementOrder: ReadonlyArray<LevelPlacementOrderEntry> = [],
): PlacedTile[] {
  if (endAnimations.length === 0) {
    return placedTilesInCmsOrder(placed, placementOrder);
  }

  const cmsOrdered = placedTilesInCmsOrder(placed, placementOrder);
  const placedByConfig = indexPlacedByConfigId(cmsOrdered);
  const endByConfig = indexEndAnimationsByConfigId(endAnimations);
  const usedPlacedKeys = new Set<string>();
  const usedEndKeys = new Set<string>();
  let nextEndTileId = END_ANIMATION_TILE_ID_BASE;

  const ordered: PlacedTile[] = [];
  for (const entry of placementOrder) {
    const key = configKey(entry.uniqueId);
    if (entry.kind === "puzzle") {
      const match = placedByConfig.get(key);
      if (match && !usedPlacedKeys.has(key)) {
        ordered.push(match);
        usedPlacedKeys.add(key);
      }
      continue;
    }
    const spec = endByConfig.get(key);
    if (spec && !usedEndKeys.has(key)) {
      ordered.push(buildEndAnimationPlacedTile(spec, nextEndTileId));
      nextEndTileId += 1;
      usedEndKeys.add(key);
    }
  }

  for (const p of cmsOrdered) {
    const key = p.tile.configId ? configKey(p.tile.configId) : "";
    if (!key || usedPlacedKeys.has(key)) {
      continue;
    }
    ordered.push(p);
    usedPlacedKeys.add(key);
  }

  /** Endanimationen ohne CMS-Eintrag auf der obersten Pixi-Ebene zeichnen. */
  return appendUnorderedEndAnimations(ordered, endAnimations, usedEndKeys);
}