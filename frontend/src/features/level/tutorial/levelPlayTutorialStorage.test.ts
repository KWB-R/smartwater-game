import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLevelPlayTutorialCompleted,
  isLevelPlayTutorialCompleted,
  markLevelPlayTutorialCompleted,
} from "@/features/level/tutorial/levelPlayTutorialStorage";

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("levelPlayTutorialStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks completion in localStorage", () => {
    vi.stubGlobal("localStorage", createStorage());
    expect(isLevelPlayTutorialCompleted()).toBe(false);
    markLevelPlayTutorialCompleted();
    expect(isLevelPlayTutorialCompleted()).toBe(true);
    clearLevelPlayTutorialCompleted();
    expect(isLevelPlayTutorialCompleted()).toBe(false);
  });
});
