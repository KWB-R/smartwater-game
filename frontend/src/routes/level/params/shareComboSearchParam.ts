/** Alphabetische Kombiteile im Parameter combo, getrennt durch +, passend zu combo__*.mp4. */
const SHARE_COMBO_QUERY_PARAM = "combo";

function sortShareComboPartIds(
  partIds: ReadonlyArray<string>,
): string[] {
  return [...partIds]
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .sort((a, b) => a.localeCompare(b, "de"));
}

export function buildShareComboSearch(partIds: ReadonlyArray<string>): string {
  const sorted = sortShareComboPartIds(partIds);
  if (sorted.length === 0) {
    return "";
  }
  const params = new URLSearchParams();
  params.set(SHARE_COMBO_QUERY_PARAM, sorted.join("+"));
  return params.toString();
}

export function parseShareComboPartIds(search: string): string[] {
  const raw = new URLSearchParams(search).get(SHARE_COMBO_QUERY_PARAM);
  if (!raw?.trim()) {
    return [];
  }
  return sortShareComboPartIds(raw.split("+"));
}
