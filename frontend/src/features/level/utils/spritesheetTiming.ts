import type { Spritesheet } from "@/features/level/types";

export function loopDurationMs(sheet: Spritesheet): number {
  if (sheet.frameRate > 0) {
    return (sheet.frameCount / sheet.frameRate) * 1_000;
  }
  if (sheet.frameDuration > 0) {
    return sheet.frameCount * sheet.frameDuration;
  }
  return Math.max(500, sheet.frameCount * 50);
}
