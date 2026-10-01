import type { TilePlacementVideo, TilePlacementVideoPhase } from "@/features/level/types";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";
import { pickTransparentVideoPlaybackUrlSync } from "@/features/level/utils/videoPlaybackUrl";

/**
 * Gemeinsame Auswahl von WebM-/MOV-URLs und Prüfung abspielbarer Bilder.
 * Renderer und Video-Pool verwenden dadurch dieselbe Logik.
 */

const VIDEO_FRAME_READY_TIMEOUT_MS = 4_000;

export type PlacementVideoPlanPhase = {
  src: string;
  loop: boolean;
  playbackRate?: number;
};

export type PlacementVideoPlaybackPlan = {
  intro: PlacementVideoPlanPhase | null;
  loop: PlacementVideoPlanPhase;
};

function phasePlaybackUrl(phase: TilePlacementVideoPhase): string | null {
  const webAbs = phase.web.url.trim()
    ? getLevelAssetUrl(phase.web.url.trim())
    : null;
  const movAbs = phase.mov.url.trim()
    ? getLevelAssetUrl(phase.mov.url.trim())
    : null;
  return pickTransparentVideoPlaybackUrlSync(webAbs, movAbs);
}

function planPhase(
  phase: TilePlacementVideoPhase,
  loop: boolean,
): PlacementVideoPlanPhase | null {
  const src = phasePlaybackUrl(phase);
  if (!src) {
    return null;
  }
  return {
    src,
    loop,
    ...(phase.playbackRate !== undefined
      ? { playbackRate: phase.playbackRate }
      : {}),
  };
}

export function resolvePlacementVideoPlaybackPlan(
  pv: TilePlacementVideo,
): PlacementVideoPlaybackPlan | null {
  const loop = planPhase(pv.loop, true);
  if (!loop) {
    return null;
  }
  return {
    intro: pv.intro ? planPhase(pv.intro, false) : null,
    loop,
  };
}

export function listPlacementVideoPlanPhases(
  plan: PlacementVideoPlaybackPlan,
): PlacementVideoPlanPhase[] {
  return plan.intro ? [plan.intro, plan.loop] : [plan.loop];
}

export function hasConfiguredIntro(pv: TilePlacementVideo): boolean {
  return Boolean(
    pv.intro?.web.url.trim() || pv.intro?.mov.url.trim(),
  );
}

export function isVideoFrameReady(v: HTMLVideoElement): boolean {
  return (
    v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.videoWidth > 0
  );
}

export function waitVideoFrameReady(
  v: HTMLVideoElement,
  timeoutMs = VIDEO_FRAME_READY_TIMEOUT_MS,
): Promise<void> {
  if (isVideoFrameReady(v)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error("video-timeout"));
    }, timeoutMs);
    const tryOk = () => {
      if (isVideoFrameReady(v)) {
        cleanup();
        resolve();
      }
    };
    const onErr = () => {
      cleanup();
      reject(new Error("video"));
    };
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      v.removeEventListener("loadeddata", tryOk);
      v.removeEventListener("canplay", tryOk);
      v.removeEventListener("playing", tryOk);
      v.removeEventListener("timeupdate", tryOk);
      v.removeEventListener("error", onErr);
    };
    v.addEventListener("loadeddata", tryOk);
    v.addEventListener("canplay", tryOk);
    v.addEventListener("playing", tryOk);
    v.addEventListener("timeupdate", tryOk);
    v.addEventListener("error", onErr);
  });
}
