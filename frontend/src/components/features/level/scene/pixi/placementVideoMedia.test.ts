import { describe, expect, it } from "vitest";

import {
  hasConfiguredIntro,
  listPlacementVideoPlanPhases,
  resolvePlacementVideoPlaybackPlan,
} from "@/components/features/level/scene/pixi/placementVideoMedia";
import type { TilePlacementVideo } from "@/features/level/types";

function media(id: number, url: string) {
  return { id, url };
}

function placementVideo(
  partial: Partial<TilePlacementVideo> = {},
): TilePlacementVideo {
  return {
    preview: media(1, "assets/preview.webp"),
    loop: {
      web: media(2, "assets/loop.webm"),
      mov: media(3, "assets/loop.mov"),
      playbackRate: 1.25,
    },
    ...partial,
  };
}

describe("resolvePlacementVideoPlaybackPlan", () => {
  it("resolves optional intro followed by mandatory loop", () => {
    const plan = resolvePlacementVideoPlaybackPlan(
      placementVideo({
        intro: {
          web: media(4, "assets/intro.webm"),
          mov: media(5, "assets/intro.mov"),
          playbackRate: 0.75,
        },
      }),
    );

    expect(plan?.intro).toEqual({
      src: "/assets/intro.webm",
      loop: false,
      playbackRate: 0.75,
    });
    expect(plan?.loop).toEqual({
      src: "/assets/loop.webm",
      loop: true,
      playbackRate: 1.25,
    });
    expect(plan ? listPlacementVideoPlanPhases(plan).map((p) => p.src) : []).toEqual([
      "/assets/intro.webm",
      "/assets/loop.webm",
    ]);
  });

  it("resolves loop-only videos as immediate loop playback", () => {
    const pv = placementVideo();
    const plan = resolvePlacementVideoPlaybackPlan(pv);

    expect(hasConfiguredIntro(pv)).toBe(false);
    expect(plan?.intro).toBeNull();
    expect(plan?.loop.src).toBe("/assets/loop.webm");
  });
});
