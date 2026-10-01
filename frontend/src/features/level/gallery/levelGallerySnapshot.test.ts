import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearGallerySnapshot,
  readGallerySnapshot,
  writeGallerySnapshot,
} from "@/features/level/gallery/levelGallerySnapshot";

const LEVEL_KEY = "level-doc-1";

function storageKey(levelKey: string): string {
  return `swg-level-gallery:${levelKey}`;
}

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  } as Storage;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("levelGallerySnapshot", () => {
  it("round-trips placed tiles", () => {
    const tiles = [
      { placementKey: "a", tileId: 1, position: { x: 0, y: 0 } },
    ];
    writeGallerySnapshot(LEVEL_KEY, tiles);
    expect(readGallerySnapshot(LEVEL_KEY)).toMatchObject({
      levelKey: LEVEL_KEY,
      placedTiles: tiles,
    });
    expect(localStorage.getItem(storageKey(LEVEL_KEY))).toBeTruthy();
  });

  it("clears snapshot", () => {
    writeGallerySnapshot(LEVEL_KEY, []);
    clearGallerySnapshot(LEVEL_KEY);
    expect(readGallerySnapshot(LEVEL_KEY)).toBeNull();
  });
});
