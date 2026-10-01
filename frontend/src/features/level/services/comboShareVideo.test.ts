import { describe, expect, it } from "vitest";

import { emptyPoints } from "@/features/level/logic/points";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Tile } from "@/features/level/types";
import {
  buildComboShareVideoFileName,
  comboShareVideoPartIds,
  resolveComboShareVideoPosterUrl,
  resolveComboShareVideoUrl,
  resolveComboShareImageUrl,
} from "@/features/level/services/comboShareVideo";

function tile(configId: string): Tile {
  return {
    id: 1,
    configId,
    name: configId,
    content: null,
    image: { id: 1, url: "" },
    position: { x: 0, y: 0 },
    size: { x: 1, y: 1 },
    placed: true,
    helper: null,
    socket: null,
    placementVideo: null,
    measureEffective: false,
    pointMatrix: emptyPoints(),
  };
}

function placed(configId: string): PlacedTile {
  return {
    placementKey: configId,
    tile: tile(configId),
    position: { x: 0, y: 0 },
  };
}

describe("comboShareVideo", () => {
  it("builds filename with + between puzzle ids", () => {
    expect(
      buildComboShareVideoFileName([
        "baum",
        "eisdiele",
        "entsiegelung",
        "gelaenderbegruenung",
        "mulde",
      ]),
    ).toBe(
      "combo__baum+eisdiele+entsiegelung+gelaenderbegruenung+mulde.mp4",
    );
  });

  it("orders part ids alphabetically (de)", () => {
    const ids = comboShareVideoPartIds(
      [placed("mulde"), placed("baum"), placed("eisdiele")],
      [
        { kind: "puzzle", uniqueId: "mulde" },
        { kind: "puzzle", uniqueId: "baum" },
        { kind: "puzzle", uniqueId: "eisdiele" },
      ],
    );
    expect(ids).toEqual(["baum", "eisdiele", "mulde"]);
  });

  it("resolves URL with encoded + in filename", () => {
    const url = resolveComboShareVideoUrl({
      baseUrl: "http://127.0.0.1:8787",
      assetsFolder: "lichtenberg/level_1",
      partIds: ["baum", "eisdiele"],
    });
    expect(url).toBe(
      "http://127.0.0.1:8787/lichtenberg/level_1/combo__baum%2Beisdiele.mp4",
    );
  });

  it("resolves poster URL from combo mp4", () => {
    expect(
      resolveComboShareVideoPosterUrl(
        "http://127.0.0.1:8787/lichtenberg/level_1/combo__baum%2Beisdiele.mp4",
      ),
    ).toBe(
      "http://127.0.0.1:8787/lichtenberg/level_1/combo__baum%2Beisdiele.webp",
    );
  });

  it("resolves image URL directly as webp", () => {
    expect(
      resolveComboShareImageUrl({
        baseUrl: "http://127.0.0.1:8787",
        assetsFolder: "lichtenberg/level_1",
        partIds: ["baum", "eisdiele"],
      }),
    ).toBe(
      "http://127.0.0.1:8787/lichtenberg/level_1/combo__baum%2Beisdiele.webp",
    );
  });
});
