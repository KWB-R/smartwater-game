/** Relativer Pfad unter src/assets mit Schrägstrichen und ohne führenden Schrägstrich. */
export function normalizeLevelAssetsFolderPath(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  let posix = trimmed.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
  if (/^assets\//i.test(posix)) {
    posix = posix.slice("assets/".length);
  }
  return posix.length > 0 ? posix : null;
}
