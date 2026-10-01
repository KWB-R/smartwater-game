import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { sessionStore } from "@/lib/storage/webStorage";

export type LevelPlayContext = {
  districtName: string;
  levelName: string;
  missionTitle?: string;
  /** Kontext für die Rückkehr zur Kartendetailansicht nach Quiz oder Teilen. */
  districtRouteId?: string;
};

function storageKey(levelKey: string): string {
  return `${STORAGE_KEYS.levelPlayContextPrefix}${levelKey}`;
}

export function persistLevelPlayContext(
  levelKey: string,
  context: LevelPlayContext,
): void {
  sessionStore.setJson(storageKey(levelKey), context);
}

export function readLevelPlayContext(
  levelKey: string,
): LevelPlayContext | null {
  return sessionStore.getJson(storageKey(levelKey), (value) => {
    const parsed = value as LevelPlayContext;
    if (
      typeof parsed?.districtName !== "string" ||
      typeof parsed.levelName !== "string"
    ) {
      return null;
    }
    return parsed;
  });
}
