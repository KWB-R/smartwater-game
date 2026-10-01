import { describe, expect, it } from "vitest";

import { buildSmartwaterAssetsUrlMap } from "@/features/level/services/levelAssetService";
import { normalizeLevelAssetsFolderPath } from "@/domain/normalizeLevelAssetsFolderPath";
import {
  listLevelAssetFolders,
  resolveLevelAssetsFolder,
} from "@/features/level/services/resolveLevelAssetsFolder";

describe("resolveLevelAssetsFolder", () => {
  it("prefers CMS assetsFolder when present in url map", () => {
    const urlMap = new Map<string, string>([
      ["custom/level_x/config.json", "/cfg"],
      ["lichtenberg/level_1/background.webp", "/bg.webp"],
    ]);
    const folder = resolveLevelAssetsFolder(
      { bezirkId: "lichtenberg" },
      { id: 1, slug: "level_1", assetsFolder: "custom/level_x" },
      urlMap,
    );
    expect(folder).toBe("custom/level_x");
  });

  it("returns matching bezirk/slug folder when present in url map", () => {
    const urlMap = new Map<string, string>([
      ["lichtenberg/level_1/background.webp", "/assets/bg.webp"],
    ]);
    const folder = resolveLevelAssetsFolder(
      { bezirkId: "lichtenberg" },
      { id: 1, slug: "level_1", assetsFolder: null },
      urlMap,
    );
    expect(folder).toBe("lichtenberg/level_1");
  });

  it("returns empty string when no folders match", () => {
    const urlMap = new Map<string, string>();
    const folder = resolveLevelAssetsFolder(
      { bezirkId: "missing" },
      { id: 99, slug: null, assetsFolder: null },
      urlMap,
    );
    expect(folder).toBe("");
  });

  it("strips assets/ prefix from CMS path and uses spandau bundle", () => {
    const urlMap = buildSmartwaterAssetsUrlMap();
    const folder = resolveLevelAssetsFolder(
      { bezirkId: "lichtenberg" },
      { id: 1, slug: "level_1", assetsFolder: "assets/spandau/level_1" },
      urlMap,
    );
    expect(folder).toBe("spandau/level_1");
  });

  it("trusts CMS assetsFolder even when url map has no files yet", () => {
    const urlMap = new Map<string, string>([
      ["lichtenberg/level_1/background.webp", "/bg.webp"],
    ]);
    const folder = resolveLevelAssetsFolder(
      { bezirkId: "lichtenberg" },
      { id: 1, slug: "level_1", assetsFolder: "future/bezirk/level_x" },
      urlMap,
    );
    expect(folder).toBe("future/bezirk/level_x");
  });
});

describe("normalizeLevelAssetsFolderPath", () => {
  it("removes leading assets/ segment", () => {
    expect(normalizeLevelAssetsFolderPath("assets/spandau/level_1")).toBe(
      "spandau/level_1",
    );
  });
});

describe("listLevelAssetFolders", () => {
  it("lists unique two-segment folders from url map keys", () => {
    const urlMap = new Map<string, string>([
      ["a/one/tile.webp", "/1"],
      ["a/one/other.webp", "/2"],
      ["b/two/x.webp", "/3"],
    ]);
    expect(listLevelAssetFolders(urlMap).sort()).toEqual(["a/one", "b/two"]);
  });
});
