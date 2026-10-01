import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localStore } from "@/lib/storage/webStorage";

const STORAGE_KEY = STORAGE_KEYS.levelPlayTutorialCompleted;

export function isLevelPlayTutorialCompleted(): boolean {
  return localStore.get(STORAGE_KEY) === "1";
}

export function markLevelPlayTutorialCompleted(): void {
  localStore.set(STORAGE_KEY, "1");
}

export function clearLevelPlayTutorialCompleted(): void {
  localStore.remove(STORAGE_KEY);
}
