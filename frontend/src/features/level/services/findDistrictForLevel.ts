import type { District, DistrictLevelSummary } from "@/types/content";

function levelMatches(
  a: Pick<DistrictLevelSummary, "id" | "documentId">,
  b: Pick<DistrictLevelSummary, "id" | "documentId">,
): boolean {
  if (a.id === b.id) {
    return true;
  }
  const docA = a.documentId?.trim();
  const docB = b.documentId?.trim();
  return Boolean(docA && docB && docA === docB);
}

/** Ermittelt den Bezirk aus der Kartenliste, falls er im Router-Zustand fehlt. */
export function findDistrictForLevel(
  districts: District[],
  level: Pick<DistrictLevelSummary, "id" | "documentId"> | null | undefined,
): District | null {
  if (!level) {
    return null;
  }
  for (const district of districts) {
    if (district.levels.some((entry) => levelMatches(level, entry))) {
      return district;
    }
  }
  return null;
}

export function findDistrictLevelInList(
  district: District,
  level: Pick<DistrictLevelSummary, "id" | "documentId">,
): DistrictLevelSummary | null {
  return district.levels.find((entry) => levelMatches(level, entry)) ?? null;
}
