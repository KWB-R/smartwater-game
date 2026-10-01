export const LEVEL_TILE_DETAIL_PARAM = "tile" as const;

export function parseTileDetailParam(
  value: string | null,
): number | null {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    return null;
  }
  return n;
}
