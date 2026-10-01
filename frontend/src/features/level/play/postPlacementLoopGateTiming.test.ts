import { describe, expect, it } from "vitest";
import {
  POST_PLACEMENT_LOOP_LEAD_MS,
  PRE_QUIZ_DURING_CONFETTI_MS,
  postPlacementLoopGateDelayMs,
  postPlacementPreQuizDelayAfterCelebrationMs,
  postPlacementSpritesheetLoopGateDelayMs,
  resolvePostPlacementSpritesheetLoopGateDelayMs,
} from "@/features/level/play/postPlacementLoopGateTiming";
import type { Tile } from "@/features/level/types";
import { emptyPoints } from "@/features/level/logic/points";

describe("postPlacementPreQuizDelayAfterCelebrationMs", () => {
  it("waits full confetti window when celebration just started", () => {
    expect(postPlacementPreQuizDelayAfterCelebrationMs(0)).toBe(
      PRE_QUIZ_DURING_CONFETTI_MS,
    );
  });

  it("opens immediately when intro already exceeded confetti window", () => {
    expect(
      postPlacementPreQuizDelayAfterCelebrationMs(PRE_QUIZ_DURING_CONFETTI_MS + 500),
    ).toBe(0);
  });
});

describe("postPlacementLoopGateDelayMs", () => {
  it("subtracts lead from loop only", () => {
    expect(
      postPlacementLoopGateDelayMs({
        loopDurationMs: 4_000,
      }),
    ).toBe(4_000 - POST_PLACEMENT_LOOP_LEAD_MS);
  });

  it("never goes negative", () => {
    expect(
      postPlacementLoopGateDelayMs({
        loopDurationMs: 200,
        leadMs: 450,
      }),
    ).toBe(0);
  });
});

describe("postPlacementSpritesheetLoopGateDelayMs", () => {
  it("subtracts lead from sheet loop", () => {
    expect(postPlacementSpritesheetLoopGateDelayMs(2_000)).toBe(
      2_000 - POST_PLACEMENT_LOOP_LEAD_MS,
    );
  });
});

describe("resolvePostPlacementSpritesheetLoopGateDelayMs", () => {
  it("returns null when tile has placement video", () => {
    const tile = {
      placementVideo: { loop: { web: { url: "a.webm" } } },
      image: { url: "x.webp" },
    } as unknown as Tile;
    expect(resolvePostPlacementSpritesheetLoopGateDelayMs(tile)).toBeNull();
  });

  it("uses spritesheet loop duration", () => {
    const tile: Tile = {
      id: 1,
      name: "t",
      content: null,
      image: {
        id: 1,
        url: "sheet.webp",
        frameSize: { x: 10, y: 10 },
        frameCount: 10,
        gridColumns: 5,
        frameRate: 10,
        frameDuration: 0,
      },
      position: { x: 0, y: 0 },
      size: { x: 10, y: 10 },
      placed: true,
      helper: null,
      socket: null,
      measureEffective: false,
      pointMatrix: emptyPoints(),
    };
    // Zehn Bilder bei zehn Bildern pro Sekunde ergeben 1000 ms; 1100 ms Vorlauf begrenzen die Wartezeit auf null.
    expect(resolvePostPlacementSpritesheetLoopGateDelayMs(tile)).toBe(0);
  });
});
