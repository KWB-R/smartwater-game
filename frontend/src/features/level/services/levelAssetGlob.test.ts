import { describe, expect, it } from "vitest";
import { buildSmartwaterAssetsUrlMap } from "@/features/level/services/levelAssetService";
import {
  getLevelConfigForAssetsFolder,
  requireLevelConfigForAssetsFolder,
} from "@/features/level/services/levelConfigByFolder";
import { EMPTY_LEVEL_CONFIG } from "@/features/level/config/emptyLevelConfig";

// Unabhängig von separat bereitgestellten Spielinhalten: dieses Level fehlt bewusst.
const absentFolder = "__unavailable__/level_0";

describe("fehlende Levelmedien und Konfigurationen", () => {
  it("returns no fabricated asset URL for an unavailable level", () => {
    const map = buildSmartwaterAssetsUrlMap();
    expect(map.has(`${absentFolder}/background.webp`)).toBe(false);
    expect([...map.keys()].filter((key) => key.startsWith(`${absentFolder}/`))).toEqual([]);
  });

  it("returns the empty-level fallback when config.json is unavailable", () => {
    expect(getLevelConfigForAssetsFolder(absentFolder)).toBeNull();
    expect(requireLevelConfigForAssetsFolder(absentFolder)).toEqual(EMPTY_LEVEL_CONFIG);
    expect(requireLevelConfigForAssetsFolder(absentFolder).objects).toEqual([]);
    expect(requireLevelConfigForAssetsFolder(absentFolder).background.url).toBe("");
  });
});
