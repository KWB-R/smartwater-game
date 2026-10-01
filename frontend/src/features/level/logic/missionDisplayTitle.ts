/** Anzeigename der Mission im Header (erster nicht-leerer Kandidat). */
export function missionDisplayTitle(
  ...candidates: (string | null | undefined)[]
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "Mission";
}
