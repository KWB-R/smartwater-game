import type { Tile, TilePlacementVideo } from "@/features/level/types";

import type { DesignPoint } from "@/components/features/level/scene/bridge/designViewRect";
import { designSizeToHostViewportPx } from "@/components/features/level/scene/bridge/designViewRect";

type DesignRect = { x: number; y: number; w: number; h: number };

function fromVectors(
  pos: { x: number; y: number } | undefined,
  size: { x: number; y: number } | undefined,
): DesignRect | null {
  if (!pos || !size) {
    return null;
  }
  return { x: pos.x, y: pos.y, w: size.x, h: size.y };
}

function tileFallbackRect(tile: Tile): DesignRect {
  return {
    x: tile.position.x,
    y: tile.position.y,
    w: tile.size.x,
    h: tile.size.y,
  };
}

/** Gleiche Logik wie `rectFromPhase(..., "placed")` in placementVideo. */
function placedVideoRect(pv: TilePlacementVideo, tile: Tile): DesignRect {
  return (
    fromVectors(pv.loop.renderPosition, pv.loop.renderSize) ??
    fromVectors(pv.renderPosition, pv.renderSize) ??
    tileFallbackRect(tile)
  );
}

function tilePlacedVisualDesignRect(tile: Tile): DesignRect {
  const pv = tile.placementVideo;
  if (pv) {
    return placedVideoRect(pv, tile);
  }
  return tileFallbackRect(tile);
}

export function tilePlacedVisualDesignCenter(tile: Tile): DesignPoint {
  const rect = tilePlacedVisualDesignRect(tile);
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** Explosionsradius in Pixeln, passend zur Größe des platzierten Puzzleteils. */
export function tilePlacedVisualExplosionSpreadPx(
  host: HTMLElement,
  tile: Tile,
): number {
  const rect = tilePlacedVisualDesignRect(tile);
  const { width, height } = designSizeToHostViewportPx(host, rect.w, rect.h);
  const minSide = Math.min(width, height);
  return Math.min(132, Math.max(20, minSide * 0.44));
}
