import { describe, expect, it, vi } from "vitest";

import {
  ensureLevelPackagePreload,
  getLevelAssetPreloadSnapshot,
  levelAssetPreloadReady,
} from "@/features/level/services/levelAssetPreloadSession";

vi.mock("@/features/level/services/prepareLevelPackage", () => ({
  prepareLevelPackage: vi.fn(() => Promise.resolve({ level: null, urls: [] })),
}));

import { prepareLevelPackage } from "@/features/level/services/prepareLevelPackage";

describe("levelAssetPreloadSession", () => {
  it("top-ups preload in background when assetsFolder changes for same level", async () => {
    const mocked = vi.mocked(prepareLevelPackage);
    mocked.mockClear();

    ensureLevelPackagePreload("vcyr98rqviujhxfdg5kplw8i", {
      levelId: "vcyr98rqviujhxfdg5kplw8i",
      levelKey: "vcyr98rqviujhxfdg5kplw8i",
      assetsFolder: "",
    });

    const entry = getLevelAssetPreloadSnapshot("vcyr98rqviujhxfdg5kplw8i");
    expect(entry.status).toBe("loading");

    await vi.waitFor(() => {
      expect(levelAssetPreloadReady("vcyr98rqviujhxfdg5kplw8i")).toBe(true);
    });
    expect(mocked).toHaveBeenCalledTimes(1);

    ensureLevelPackagePreload("vcyr98rqviujhxfdg5kplw8i", {
      levelId: "vcyr98rqviujhxfdg5kplw8i",
      levelKey: "vcyr98rqviujhxfdg5kplw8i",
      assetsFolder: "treptow-koepenick/level_1",
    });

    expect(mocked).toHaveBeenCalledTimes(2);
    expect(getLevelAssetPreloadSnapshot("vcyr98rqviujhxfdg5kplw8i").status).toBe(
      "done",
    );
    expect(levelAssetPreloadReady("vcyr98rqviujhxfdg5kplw8i")).toBe(true);
  });
});
