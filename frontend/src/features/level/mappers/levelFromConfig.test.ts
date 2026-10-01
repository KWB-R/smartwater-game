import { describe, expect, it } from "vitest";

import {
  buildLevelFromConfig,
  getLevelEndAnimationSpecs,
} from "@/features/level/mappers/levelFromConfig";
import { parseLevelConfigJson } from "@/features/level/schemas/levelConfigSchema";

const ASSETS_FOLDER = "test/level";

function urlMap(files: readonly string[]): Map<string, string> {
  return new Map(files.map((file) => [`${ASSETS_FOLDER}/${file}`, `/assets/${file}`]));
}

function baseObject() {
  return {
    id: "tree",
    image: {
      url: `${ASSETS_FOLDER}/tree.webp`,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
  };
}

describe("buildLevelFromConfig objects", () => {
  it("includes every placeable config object as a top-level tile (no socket-only filter)", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [
        {
          id: "intensive_begruenung",
          image: {
            url: `${ASSETS_FOLDER}/intensive_begruenung.webp`,
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
          },
          socket: {
            url: `${ASSETS_FOLDER}/intensive_begruenung_socket.webp`,
            position: { x: 10, y: 10 },
            size: { width: 20, height: 20 },
          },
          placementVideo: {
            loop: { url: `${ASSETS_FOLDER}/intensive_begruenung.webm` },
          },
        },
      ],
    });

    const level = buildLevelFromConfig(
      urlMap([
        "background.webp",
        "intensive_begruenung.webp",
        "intensive_begruenung_socket.webp",
        "intensive_begruenung.webm",
        "intensive_begruenung.mov",
      ]),
      { assetsFolder: ASSETS_FOLDER, config },
    );

    expect(level.tiles.map((t) => t.configId)).toEqual(["intensive_begruenung"]);
    expect(level.tiles[0]?.socket).toBeNull();
  });
});

describe("buildLevelFromConfig placementVideo", () => {
  it("maps optional intro plus mandatory loop into video phases", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [
        {
          ...baseObject(),
          placementVideo: {
            intro: {
              url: `${ASSETS_FOLDER}/tree_intro.webm`,
              position: { x: 1, y: 2 },
              size: { width: 30, height: 40 },
              playbackRate: 0.75,
            },
            loop: {
              url: `${ASSETS_FOLDER}/tree_loop.webm`,
              position: { x: 3, y: 4 },
              size: { width: 50, height: 60 },
              playbackRate: 1.25,
            },
          },
        },
      ],
    });

    const level = buildLevelFromConfig(
      urlMap([
        "background.webp",
        "tree.webp",
        "tree_intro.webm",
        "tree_intro.mov",
        "tree_loop.webm",
        "tree_loop.mov",
      ]),
      { assetsFolder: ASSETS_FOLDER, config },
    );

    const placementVideo = level.tiles[0]?.placementVideo;

    expect(placementVideo?.intro?.web.url).toBe("/assets/tree_intro.webm");
    expect(placementVideo?.intro?.mov.url).toBe("/assets/tree_intro.mov");
    expect(placementVideo?.intro?.playbackRate).toBe(0.75);
    expect(placementVideo?.loop.web.url).toBe("/assets/tree_loop.webm");
    expect(placementVideo?.loop.mov.url).toBe("/assets/tree_loop.mov");
    expect(placementVideo?.loop.playbackRate).toBe(1.25);
  });

  it("maps loop-only placement videos without creating an intro", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [
        {
          ...baseObject(),
          placementVideo: {
            loop: {
              url: `${ASSETS_FOLDER}/tree_loop.webm`,
            },
          },
        },
      ],
    });

    const level = buildLevelFromConfig(
      urlMap(["background.webp", "tree.webp", "tree_loop.webm", "tree_loop.mov"]),
      { assetsFolder: ASSETS_FOLDER, config },
    );

    const placementVideo = level.tiles[0]?.placementVideo;

    expect(placementVideo?.intro).toBeUndefined();
    expect(placementVideo?.loop.web.url).toBe("/assets/tree_loop.webm");
  });
});

describe("getLevelEndAnimationSpecs", () => {
  it("resolves explicit WebM and MOV end animation variants", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [],
      endAnimation: [{ url: `${ASSETS_FOLDER}/endanimation.webm` }],
    });

    const specs = getLevelEndAnimationSpecs(
      urlMap(["endanimation.webm", "endanimation.mov"]),
      ASSETS_FOLDER,
      config,
    );

    expect(specs[0]?.webUrl).toBe("/assets/endanimation.webm");
    expect(specs[0]?.movUrl).toBe("/assets/endanimation.mov");
  });

  it("does not hide a missing MOV end animation behind WebM or MP4 fallback", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [],
      endAnimation: [{ url: `${ASSETS_FOLDER}/endanimation.webm` }],
    });

    const specs = getLevelEndAnimationSpecs(
      urlMap(["endanimation.webm", "endanimation.mp4"]),
      ASSETS_FOLDER,
      config,
    );

    expect(specs).toEqual([]);
  });
});

describe("levelConfigSchema placementVideo", () => {
  it("maps placedVideoWeb alias to loop (Charlottenburg intensive form)", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [
        {
          ...baseObject(),
          placementVideo: {
            placedVideoWeb: {
              url: `${ASSETS_FOLDER}/tree.webm`,
              position: { x: 1, y: 2 },
              size: { width: 30, height: 40 },
            },
            placedVideo: {
              url: `${ASSETS_FOLDER}/tree.mov`,
              position: { x: 1, y: 2 },
              size: { width: 30, height: 40 },
            },
          },
        },
      ],
    });

    expect(config.objects[0]?.placementVideo).toEqual({
      loop: {
        url: `${ASSETS_FOLDER}/tree.webm`,
        position: { x: 1, y: 2 },
        size: { width: 30, height: 40 },
      },
    });
  });

  it("treats an empty placementVideo object as no placement video", () => {
    const config = parseLevelConfigJson({
      name: "Test",
      background: { url: `${ASSETS_FOLDER}/background.webp` },
      objects: [{ ...baseObject(), placementVideo: {} }],
    });

    expect(config.objects[0]?.placementVideo).toBeUndefined();
  });

  it("rejects intro-only placement videos because loop is mandatory", () => {
    expect(() =>
      parseLevelConfigJson({
        name: "Test",
        background: { url: `${ASSETS_FOLDER}/background.webp` },
        objects: [
          {
            ...baseObject(),
            placementVideo: {
              intro: { url: `${ASSETS_FOLDER}/tree_intro.webm` },
            },
          },
        ],
      }),
    ).toThrow();
  });
});
