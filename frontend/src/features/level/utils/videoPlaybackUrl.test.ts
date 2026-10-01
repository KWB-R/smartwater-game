import { describe, expect, it } from "vitest";

import {
  filterPreloadUrlsForVideoPlayback,
  pickTransparentVideoPreloadUrl,
  shouldBlitWebmAlphaToCanvas,
  shouldUseWebmPlaybackUrl,
} from "@/features/level/utils/videoPlaybackUrl";

describe("filterPreloadUrlsForVideoPlayback", () => {
  it("keeps only webm when WebM alpha is supported", () => {
    const urls = [
      "/assets/foo/intro.webm",
      "/assets/foo/intro.mov",
      "/assets/foo/preview.webp",
    ];
    expect(filterPreloadUrlsForVideoPlayback(urls, true).sort()).toEqual(
      ["/assets/foo/intro.webm", "/assets/foo/preview.webp"].sort(),
    );
  });

  it("keeps only mov when WebM alpha is not supported", () => {
    const urls = [
      "https://cdn.example/assets/foo/loop.webm",
      "https://cdn.example/assets/foo/loop.mov",
    ];
    expect(filterPreloadUrlsForVideoPlayback(urls, false)).toEqual([
      "https://cdn.example/assets/foo/loop.mov",
    ]);
  });

  it("leaves unrelated video extensions untouched", () => {
    const urls = ["/assets/foo/clip.mp4"];
    expect(filterPreloadUrlsForVideoPlayback(urls, true)).toEqual(urls);
  });

  it("does not synthesize a missing webm preload URL from mov", () => {
    expect(
      filterPreloadUrlsForVideoPlayback(["/assets/foo/intro.mov"], true),
    ).toEqual([]);
  });
});

describe("shouldUseWebmPlaybackUrl", () => {
  it("keeps WebM until the canvas test clearly fails", () => {
    expect(shouldUseWebmPlaybackUrl(null, false)).toBe(true);
    expect(shouldUseWebmPlaybackUrl("unknown", false)).toBe(true);
    expect(shouldUseWebmPlaybackUrl("supported", false)).toBe(true);
    expect(shouldUseWebmPlaybackUrl("unsupported", false)).toBe(true);
  });

  it("uses MOV only when canvas alpha is unsupported and HEVC plays", () => {
    expect(shouldUseWebmPlaybackUrl("unsupported", true)).toBe(false);
    expect(shouldUseWebmPlaybackUrl("supported", true)).toBe(true);
    expect(shouldUseWebmPlaybackUrl("unknown", true)).toBe(true);
  });
});

describe("shouldBlitWebmAlphaToCanvas", () => {
  it("blits only when canvas alpha is clearly supported", () => {
    expect(shouldBlitWebmAlphaToCanvas("supported")).toBe(true);
    expect(shouldBlitWebmAlphaToCanvas("unsupported")).toBe(false);
    expect(shouldBlitWebmAlphaToCanvas("unknown")).toBe(false);
    expect(shouldBlitWebmAlphaToCanvas(null)).toBe(false);
  });
});

describe("pickTransparentVideoPreloadUrl", () => {
  it("uses only explicit URLs and does not swap file extensions", () => {
    expect(pickTransparentVideoPreloadUrl(null, "/assets/foo.mov", true)).toBe(
      null,
    );
    expect(
      pickTransparentVideoPreloadUrl("/assets/foo.webm", null, false),
    ).toBe(null);
  });
});
