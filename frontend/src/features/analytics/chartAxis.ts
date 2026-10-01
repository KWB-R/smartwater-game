/** Gemeinsame Berechnung der Y-Achsen für Statistikdiagramme. */

export function niceCeil(value: number): number {
  if (value <= 1) return 1;
  if (value <= 5) return 5;
  if (value <= 10) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = Math.ceil(value / magnitude);
  return normalized * magnitude;
}

/** Gleichmäßige Ticks von 0 … axisMax (axisMax inklusive). */
export function buildAxisTicks(axisMax: number): number[] {
  const step = Math.max(1, Math.ceil(axisMax / 5));
  const ticks: number[] = [];
  for (let v = 0; v < axisMax; v += step) {
    ticks.push(v);
  }
  ticks.push(axisMax);
  return ticks;
}
