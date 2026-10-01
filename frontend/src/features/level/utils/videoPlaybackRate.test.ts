import { describe, expect, it } from "vitest";
import {
  applyOptionalVideoPlaybackRate,
  normalizeConfigPlaybackRate,
} from "@/features/level/utils/videoPlaybackRate";

describe("normalizeConfigPlaybackRate", () => {
  it("returns undefined when omitted", () => {
    expect(normalizeConfigPlaybackRate(undefined)).toBeUndefined();
  });

  it("clamps to browser-friendly range", () => {
    expect(normalizeConfigPlaybackRate(0.1)).toBe(0.25);
    expect(normalizeConfigPlaybackRate(10)).toBe(4);
    expect(normalizeConfigPlaybackRate(1.5)).toBe(1.5);
  });

  it("rejects non-positive values", () => {
    expect(normalizeConfigPlaybackRate(0)).toBeUndefined();
    expect(normalizeConfigPlaybackRate(-1)).toBeUndefined();
    expect(normalizeConfigPlaybackRate(Number.NaN)).toBeUndefined();
  });
});

describe("applyOptionalVideoPlaybackRate", () => {
  it("sets playbackRate on video when provided", () => {
    const video = {
      playbackRate: 1,
      defaultPlaybackRate: 1,
    } as HTMLVideoElement;
    applyOptionalVideoPlaybackRate(video, 0.75);
    expect(video.playbackRate).toBe(0.75);
    expect(video.defaultPlaybackRate).toBe(0.75);
  });

  it("leaves default when rate omitted", () => {
    const video = {
      playbackRate: 1,
      defaultPlaybackRate: 1,
    } as HTMLVideoElement;
    applyOptionalVideoPlaybackRate(video, undefined);
    expect(video.playbackRate).toBe(1);
  });
});
