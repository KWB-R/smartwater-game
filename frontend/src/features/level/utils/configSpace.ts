import { DESIGN_H, DESIGN_W } from "@/components/features/level/scene/bridge/designViewRect";

/** Logischer Pixelraum der Level-Config (Hintergrund + Objekt-Koordinaten). */
export type ConfigReference = { width: number; height: number };

/** Standard-Referenz = Design-Board (config.json-Koordinaten skalieren hierhin). */
export const DEFAULT_LEVEL_CONFIG_REFERENCE: ConfigReference = {
  width: DESIGN_W,
  height: DESIGN_H,
};

/**
 * Skaliert Konfigurationskoordinaten auf beiden Achsen gleichmäßig in den Designraum.
 */
export function uniformConfigToDesignScale(ref: ConfigReference): number {
  const sx = DESIGN_W / ref.width;
  const sy = DESIGN_H / ref.height;
  if (Math.abs(sx - sy) > 1e-4) {
    return Math.min(sx, sy);
  }
  return sx;
}

export function configPointToDesign(
  p: { x: number; y: number },
  ref: ConfigReference = DEFAULT_LEVEL_CONFIG_REFERENCE,
): { x: number; y: number } {
  const s = uniformConfigToDesignScale(ref);
  return { x: p.x * s, y: p.y * s };
}

export function configSizeToDesign(
  size: { width: number; height: number },
  ref: ConfigReference = DEFAULT_LEVEL_CONFIG_REFERENCE,
): { x: number; y: number } {
  const s = uniformConfigToDesignScale(ref);
  return { x: size.width * s, y: size.height * s };
}
