import { loopDurationMs } from "@/features/level/utils/spritesheetTiming";
import type { Tile } from "@/features/level/types";
import {
  resolvePlacementVideoPlaybackPlan,
  type PlacementVideoPlanPhase,
} from "@/components/features/level/scene/pixi/placementVideoMedia";
import { isSpritesheet } from "@/features/level/services/levelAssetUrls";

/** Zeitlicher Vorlauf vor Ende der ersten Wiederholung für die Abschlussansicht in Millisekunden. */
export const POST_PLACEMENT_LOOP_LEAD_MS = 1_100;

/**
 * Den Vergleich während des noch fallenden Konfettis öffnen.
 */
export const PRE_QUIZ_DURING_CONFETTI_MS = 2_400;

/** Restzeit bis zum Vergleichsübergang, gemessen ab dem Konfettistart. */
export function postPlacementPreQuizDelayAfterCelebrationMs(
  elapsedSinceCelebrationMs: number,
): number {
  return Math.max(0, PRE_QUIZ_DURING_CONFETTI_MS - elapsedSinceCelebrationMs);
}

/** Zusätzliche Pause vor dem Fehlerpanel nach den Platzierungseffekten. */
export const POST_PLACEMENT_PUZZLE_FAILED_PANEL_EXTRA_DELAY_MS = 160;

const VIDEO_DURATION_PROBE_TIMEOUT_MS = 3_000;

/**
 * Wartezeit ab Wiederholungsstart bis kurz vor deren Ende.
 * Ein vorausgehendes Intro ist darin nicht enthalten.
 */
export function postPlacementLoopGateDelayMs(options: {
  loopDurationMs: number;
  leadMs?: number;
}): number {
  const lead = options.leadMs ?? POST_PLACEMENT_LOOP_LEAD_MS;
  const loop = Math.max(0, options.loopDurationMs);
  return Math.max(0, loop - lead);
}

/** Bei Spritesheets die erste Wiederholung abwarten und den Vorlauf abziehen. */
export function postPlacementSpritesheetLoopGateDelayMs(
  sheetLoopMs: number,
  leadMs: number = POST_PLACEMENT_LOOP_LEAD_MS,
): number {
  return Math.max(0, sheetLoopMs - leadMs);
}

function wallClockMsFromPhase(
  mediaDurationMs: number,
  phase: PlacementVideoPlanPhase,
): number {
  const rate =
    typeof phase.playbackRate === "number" && phase.playbackRate > 0
      ? phase.playbackRate
      : 1;
  return mediaDurationMs / rate;
}

function probeHtmlVideoDurationMs(src: string): Promise<number | null> {
  if (typeof document === "undefined") {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    let settled = false;
    const finish = (ms: number | null) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      video.removeAttribute("src");
      video.load();
      resolve(ms);
    };
    const timeoutId = window.setTimeout(
      () => finish(null),
      VIDEO_DURATION_PROBE_TIMEOUT_MS,
    );
    video.addEventListener("loadedmetadata", () => {
      const seconds = video.duration;
      if (Number.isFinite(seconds) && seconds > 0) {
        finish(seconds * 1_000);
        return;
      }
      finish(null);
    });
    video.addEventListener("error", () => finish(null));
    video.src = src;
  });
}

/**
 * Tatsächliche Intro-Laufzeit einschließlich playbackRate.
 * null bedeutet, dass kein Intro vorhanden oder dessen Dauer unbekannt ist.
 */
export async function resolvePlacementIntroWallClockMs(
  tile: Tile,
): Promise<number | null> {
  const pv = tile.placementVideo;
  if (!pv) {
    return null;
  }
  const plan = resolvePlacementVideoPlaybackPlan(pv);
  if (!plan?.intro) {
    return null;
  }

  const introRaw = await probeHtmlVideoDurationMs(plan.intro.src);
  if (introRaw == null) {
    return null;
  }
  return wallClockMsFromPhase(introRaw, plan.intro);
}

/** Synchrone Ersatzberechnung für Spritesheet-Wiederholungen. */
export function resolvePostPlacementSpritesheetLoopGateDelayMs(
  tile: Tile,
): number | null {
  if (tile.placementVideo) {
    return null;
  }
  if (!isSpritesheet(tile.image)) {
    return null;
  }
  return postPlacementSpritesheetLoopGateDelayMs(
    loopDurationMs(tile.image),
  );
}
