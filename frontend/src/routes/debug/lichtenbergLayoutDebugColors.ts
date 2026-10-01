type LayerDebugColors = {
  outline: string;
  fill: string;
  labelBg: string;
};

function hueFromKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

/** Stabile, unterscheidbare Farben je Ebene für Rahmen und Beschriftungen der Vorschau. */
function getLayerDebugColors(key: string): LayerDebugColors {
  const h = hueFromKey(key);
  return {
    outline: `hsl(${h} 62% 38%)`,
    fill: `hsl(${h} 70% 52% / 8%)`,
    labelBg: `hsl(${h} 42% 22% / 92%)`,
  };
}

export function layerDebugColorStyle(
  key: string,
): Record<string, string> {
  const c = getLayerDebugColors(key);
  return {
    "--layer-debug-outline": c.outline,
    "--layer-debug-fill": c.fill,
    "--layer-debug-label-bg": c.labelBg,
  };
}
