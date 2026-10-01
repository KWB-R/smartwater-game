import { describe, expect, it } from "vitest";
import type { Spritesheet } from "@/features/level/types";
import { loopDurationMs } from "./spritesheetTiming";

const sheet: Spritesheet = {
  id: 1,
  url: "sheet.webp",
  frameSize: { x: 10, y: 10 },
  frameCount: 60,
  gridColumns: 10,
  frameRate: 30,
  frameDuration: 100,
};

describe("Spritesheet-Laufzeit", () => {
  it("bevorzugt die Bildrate gegenüber einer ebenfalls gesetzten Bilddauer", () => {
    expect(loopDurationMs(sheet)).toBe(2_000);
  });

  it("nutzt die Bilddauer, wenn keine positive Bildrate vorliegt", () => {
    expect(loopDurationMs({ ...sheet, frameRate: 0 })).toBe(6_000);
  });

  it("verwendet ohne Zeitangaben 50 ms je Bild, mindestens jedoch 500 ms", () => {
    expect(loopDurationMs({ ...sheet, frameRate: 0, frameDuration: 0 })).toBe(3_000);
    expect(loopDurationMs({ ...sheet, frameRate: 0, frameDuration: 0, frameCount: 2 })).toBe(500);
  });
});
