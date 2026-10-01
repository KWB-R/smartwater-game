import {
  Application,
  CanvasSource,
  Container,
  Sprite,
  Texture,
} from "pixi.js";
import {
  boardLayoutFitForHost,
  originForHost,
  scaleForHost,
} from "@/components/features/level/scene/bridge/designViewRect";
import type { Tile, TilePlacementVideo } from "@/features/level/types";
import { logError } from "@/lib/logError";
import {
  canBlitWebmAlphaToCanvas,
  getWebmAlphaSupported,
  markCanvasBlitFailed,
} from "@/features/level/utils/videoPlaybackUrl";
import { applyOptionalVideoPlaybackRate } from "@/features/level/utils/videoPlaybackRate";
import {
  resolveOfflineMediaPlaybackUrl,
  revokeOfflineMediaBlobUrl,
} from "@/pwa/resolveOfflineMediaPlaybackUrl";
import {
  acquirePlacementVideo,
  preparePlacementVideoForOverlay,
  preloadPlacementVideosInPool,
  releasePlacementVideo,
} from "@/components/features/level/scene/pixi/placementVideoPool";
import {
  isVideoFrameReady,
  type PlacementVideoPlaybackPlan,
  type PlacementVideoPlanPhase,
  resolvePlacementVideoPlaybackPlan,
  waitVideoFrameReady,
} from "@/components/features/level/scene/pixi/placementVideoMedia";

export {
  primePlacementVideosForTile,
  startPlacementVideoOnUserCommit,
  cancelPlacementVideoCommitForTile,
} from "@/components/features/level/scene/pixi/placementVideoPool";

const placementIntroWaitResolvers = new Map<string, () => void>();
const PLACEMENT_INTRO_WAIT_TIMEOUT_MS = 6_000;
const LOOP_RECOVERY_CHECK_MS = 750;
const LOOP_RECOVERY_END_EPSILON_SECONDS = 0.12;

let placementVideoPlaybackSuspended = false;

type PlacementLoopNearEndWatch = {
  placementKey: string;
  leadMs: number;
  onNearEnd: () => void;
  onLoopStarted: (() => void) | null;
  loopStartedFired: boolean;
  cancelSchedule: (() => void) | null;
};

let activeLoopNearEndWatch: PlacementLoopNearEndWatch | null = null;

export function setPlacementVideoPlaybackSuspended(suspended: boolean): void {
  placementVideoPlaybackSuspended = suspended;
}

function completePlacementIntroWait(placementKey: string | undefined): void {
  if (!placementKey) {
    return;
  }
  const resolve = placementIntroWaitResolvers.get(placementKey);
  if (resolve) {
    placementIntroWaitResolvers.delete(placementKey);
    resolve();
  }
}

/**
 * Einmalige Rückmeldungen zur Wiederholung dieses Platzierungsvideos.
 * onLoopStarted meldet das Ende des Intros; onNearEnd meldet das nahende Ende der ersten Wiederholung.
 */
export function armPlacementLoopNearEndWatch(
  placementKey: string,
  onNearEnd: () => void,
  leadMs: number,
  onLoopStarted?: () => void,
): () => void {
  activeLoopNearEndWatch?.cancelSchedule?.();
  activeLoopNearEndWatch = {
    placementKey,
    leadMs,
    onNearEnd,
    onLoopStarted: onLoopStarted ?? null,
    loopStartedFired: false,
    cancelSchedule: null,
  };
  return () => {
    if (activeLoopNearEndWatch?.placementKey !== placementKey) {
      return;
    }
    activeLoopNearEndWatch.cancelSchedule?.();
    activeLoopNearEndWatch = null;
  };
}

function scheduleFirstLoopNearEnd(
  v: HTMLVideoElement,
  leadMs: number,
  onNearEnd: () => void,
  isActive: () => boolean,
): () => void {
  let fired = false;
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

  const cleanupListeners = () => {
    v.removeEventListener("timeupdate", tryArm);
    v.removeEventListener("loadedmetadata", tryArm);
    v.removeEventListener("durationchange", tryArm);
  };

  const cleanup = () => {
    cleanupListeners();
    if (timeoutId != null) {
      globalThis.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const fire = () => {
    if (fired || !isActive()) {
      return;
    }
    fired = true;
    cleanup();
    onNearEnd();
  };

  const tryArm = () => {
    if (fired || timeoutId != null || !isActive()) {
      return;
    }
    if (!Number.isFinite(v.duration) || v.duration <= 0) {
      return;
    }
    const rate = v.playbackRate > 0 ? v.playbackRate : 1;
    const remainingMs = ((v.duration - v.currentTime) / rate) * 1_000;
    const waitMs = Math.max(0, remainingMs - leadMs);
    cleanupListeners();
    timeoutId = globalThis.setTimeout(fire, waitMs);
  };

  tryArm();
  if (timeoutId == null) {
    v.addEventListener("timeupdate", tryArm);
    v.addEventListener("loadedmetadata", tryArm);
    v.addEventListener("durationchange", tryArm);
  }

  return cleanup;
}

function notifyPlacementLoopStarted(
  placementKey: string | undefined,
  loopVid: HTMLVideoElement,
  isActive: () => boolean,
): void {
  const watch = activeLoopNearEndWatch;
  if (!watch || !placementKey || watch.placementKey !== placementKey) {
    return;
  }
  if (!watch.loopStartedFired) {
    watch.loopStartedFired = true;
    watch.onLoopStarted?.();
  }
  watch.cancelSchedule?.();
  watch.cancelSchedule = scheduleFirstLoopNearEnd(
    loopVid,
    watch.leadMs,
    () => {
      if (activeLoopNearEndWatch === watch) {
        activeLoopNearEndWatch = null;
      }
      watch.onNearEnd();
    },
    isActive,
  );
}

/**
 * Nach dem Legen: optional Intro (einmal), danach Endlos-Loop.
 * Intro nur wenn in der Level-Config `placementVideo.intro` gesetzt ist.
 */
async function resolvePlaybackPlan(
  pv: TilePlacementVideo,
): Promise<PlacementVideoPlaybackPlan | null> {
  await getWebmAlphaSupported();
  return resolvePlacementVideoPlaybackPlan(pv);
}

type DesignRect = { x: number; y: number; w: number; h: number };

function tileFallbackRect(tile: Tile): DesignRect {
  return {
    x: tile.position.x,
    y: tile.position.y,
    w: tile.size.x,
    h: tile.size.y,
  };
}

function rectFromPhase(
  pv: TilePlacementVideo,
  phase: "intro" | "loop" | "placed",
  tile: Tile,
): DesignRect {
  const fromVectors = (
    pos: { x: number; y: number } | undefined,
    size: { x: number; y: number } | undefined,
  ): DesignRect | null => {
    if (!pos || !size) return null;
    return { x: pos.x, y: pos.y, w: size.x, h: size.y };
  };

  if (phase === "intro") {
    return (
      fromVectors(pv.intro?.renderPosition, pv.intro?.renderSize) ??
      fromVectors(pv.renderPosition, pv.renderSize) ??
      tileFallbackRect(tile)
    );
  }
  if (phase === "loop") {
    return (
      fromVectors(pv.loop.renderPosition, pv.loop.renderSize) ??
      fromVectors(pv.intro?.renderPosition, pv.intro?.renderSize) ??
      fromVectors(pv.renderPosition, pv.renderSize) ??
      tileFallbackRect(tile)
    );
  }
  return (
    fromVectors(pv.loop.renderPosition, pv.loop.renderSize) ??
    fromVectors(pv.renderPosition, pv.renderSize) ??
    tileFallbackRect(tile)
  );
}

function applyClipDesignRect(
  host: HTMLElement,
  clip: HTMLDivElement,
  rect: DesignRect,
): void {
  clip.dataset.designRect = JSON.stringify(rect);
  layoutVideoWrapper(host, clip, rect);
}

function layoutVideoWrapper(
  host: HTMLElement,
  wrapper: HTMLDivElement,
  rect: DesignRect,
): void {
  const w = host.clientWidth;
  const h = host.clientHeight;
  const fit = boardLayoutFitForHost(host);
  const s = scaleForHost(w, h, fit);
  const { ox, oy } = originForHost(w, h, s, fit);
  wrapper.style.left = `${ox + rect.x * s}px`;
  wrapper.style.top = `${oy + rect.y * s}px`;
  wrapper.style.width = `${rect.w * s}px`;
  wrapper.style.height = `${rect.h * s}px`;
}

type OverlayState = {
  root: HTMLDivElement;
  ro: ResizeObserver;
  clips: Set<HTMLDivElement>;
};

const overlayByHost = new WeakMap<HTMLElement, OverlayState>();

function ensureOverlay(host: HTMLElement): OverlayState {
  const existing = overlayByHost.get(host);
  if (existing) return existing;

  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }

  const root = document.createElement("div");
  root.className = "level-placement-video-overlay";
  host.appendChild(root);

  const state: OverlayState = {
    root,
    ro: new ResizeObserver(() => {
      for (const clip of state.clips) {
        const raw = clip.dataset.designRect;
        if (!raw) continue;
        try {
          const rect = JSON.parse(raw) as DesignRect;
          layoutVideoWrapper(host, clip, rect);
        } catch (error) {
          logError("placementVideo:layout", error);
        }
      }
    }),
    clips: new Set(),
  };
  state.ro.observe(host);
  overlayByHost.set(host, state);
  return state;
}

export function teardownPlacementVideoOverlay(host: HTMLElement): void {
  const state = overlayByHost.get(host);
  if (!state) return;
  state.ro.disconnect();
  state.root.remove();
  overlayByHost.delete(host);
}

/**
 * Hält DOM-Videos in derselben Zeichenreihenfolge wie Pixi.
 * appendChild verschiebt vorhandene Elemente genauso wie Pixis addChild.
 */
export function syncPlacementVideoOverlayOrder(
  host: HTMLElement,
  placementKeys: ReadonlyArray<string>,
): void {
  const state = overlayByHost.get(host);
  if (!state || placementKeys.length === 0) {
    return;
  }
  const byKey = new Map<string, HTMLDivElement>();
  for (const clip of state.clips) {
    const key = clip.dataset.placementKey;
    if (key) {
      byKey.set(key, clip);
    }
  }
  for (const key of placementKeys) {
    const clip = byKey.get(key);
    if (clip) {
      state.root.appendChild(clip);
    }
  }
}

function createVideoClip(
  host: HTMLElement,
  rect: DesignRect,
  video: HTMLVideoElement,
): {
  clip: HTMLDivElement;
  wrap: HTMLDivElement;
  video: HTMLVideoElement;
} {
  const clip = document.createElement("div");
  clip.className = "level-placement-video-overlay__clip";
  applyClipDesignRect(host, clip, rect);

  const wrap = document.createElement("div");
  wrap.className = "level-placement-video-overlay__video-wrap";
  wrap.appendChild(video);
  clip.appendChild(wrap);
  return { clip, wrap, video };
}

/** Fängt abgelehnte play()-Promises ab, etwa bei blockierter automatischer Wiedergabe. */
async function playPlacementVideo(v: HTMLVideoElement): Promise<boolean> {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.playsInline = true;
  v.setAttribute("playsinline", "true");
  v.setAttribute("webkit-playsinline", "true");

  const attempt = async (): Promise<boolean> => {
    try {
      await v.play();
      return !v.paused;
    } catch {
      return false;
    }
  };
  if (await attempt()) {
    return true;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  return attempt();
}

function videoIsNearLoopEnd(v: HTMLVideoElement): boolean {
  return (
    Number.isFinite(v.duration) &&
    v.duration > 0 &&
    v.currentTime >= v.duration - LOOP_RECOVERY_END_EPSILON_SECONDS
  );
}

function seekVideoToStart(v: HTMLVideoElement): void {
  try {
    v.currentTime = 0;
  } catch (error) {
    logError("placementVideo:seek", error);
  }
}

function startLoopPlaybackGuard(
  v: HTMLVideoElement,
  isActive: () => boolean,
): () => void {
  let disposed = false;
  let restartPending = false;
  let intervalId: ReturnType<typeof globalThis.setInterval> | null = null;

  const canRecover = () =>
    !disposed &&
    isActive() &&
    !placementVideoPlaybackSuspended &&
    (typeof document === "undefined" || !document.hidden);

  const restart = () => {
    if (!canRecover() || restartPending) {
      return;
    }
    restartPending = true;
    requestAnimationFrame(() => {
      restartPending = false;
      if (!canRecover()) {
        return;
      }
      if (v.ended || videoIsNearLoopEnd(v)) {
        seekVideoToStart(v);
      }
      void playPlacementVideo(v);
    });
  };

  const recoverIfPausedOrEnded = () => {
    if (v.paused || v.ended || videoIsNearLoopEnd(v)) {
      restart();
    }
  };

  const onVisibilityChange = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      recoverIfPausedOrEnded();
    }
  };

  v.addEventListener("ended", restart);
  v.addEventListener("pause", recoverIfPausedOrEnded);
  v.addEventListener("stalled", recoverIfPausedOrEnded);
  v.addEventListener("waiting", recoverIfPausedOrEnded);
  globalThis.addEventListener?.("pageshow", recoverIfPausedOrEnded);
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  intervalId = globalThis.setInterval(
    recoverIfPausedOrEnded,
    LOOP_RECOVERY_CHECK_MS,
  );

  return () => {
    disposed = true;
    v.removeEventListener("ended", restart);
    v.removeEventListener("pause", recoverIfPausedOrEnded);
    v.removeEventListener("stalled", recoverIfPausedOrEnded);
    v.removeEventListener("waiting", recoverIfPausedOrEnded);
    globalThis.removeEventListener?.("pageshow", recoverIfPausedOrEnded);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    if (intervalId) {
      globalThis.clearInterval(intervalId);
    }
  };
}

async function loadAndPlay(
  v: HTMLVideoElement,
  src: string,
  loop: boolean,
  playbackRate?: number,
  restart = false,
): Promise<void> {
  applyOptionalVideoPlaybackRate(v, playbackRate);
  const playbackSrc = await resolveOfflineMediaPlaybackUrl(src);
  v.loop = loop;
  if (loop) {
    v.setAttribute("loop", "");
  } else {
    v.removeAttribute("loop");
  }

  const sameSrc =
    v.src === playbackSrc ||
    (v.currentSrc !== "" && v.currentSrc === playbackSrc);

  // Firefox kann nach dem Einbinden im verdeckten Pool paused: false melden, ohne neue Bilder zu liefern.
  // Das sichtbare Intro deshalb ausdrücklich neu starten.
  if (restart) {
    v.pause();
    seekVideoToStart(v);
  }

  if (sameSrc && isVideoFrameReady(v) && !v.paused) {
    return;
  }

  if (sameSrc && isVideoFrameReady(v)) {
    const started = await playPlacementVideo(v);
    if (started) {
      return;
    }
  }

  if (v.src && v.src !== playbackSrc) {
    revokeOfflineMediaBlobUrl(v.src);
  }
  if (!sameSrc) {
    v.src = playbackSrc;
    v.load();
  }
  // Firefox: Frame oft erst nach play(), nicht nach load() allein.
  void playPlacementVideo(v);
  await waitVideoFrameReady(v);
  if (!v.paused) {
    return;
  }
  const started = await playPlacementVideo(v);
  if (!started) {
    throw new Error("placement-video-play");
  }
}

function waitVideoEnded(v: HTMLVideoElement): Promise<void> {
  if (v.ended) {
    return Promise.resolve();
  }
  const durationMs = Number.isFinite(v.duration)
    ? Math.max(1_000, v.duration * 1_000 + 1_000)
    : 10_000;
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup();
      reject(new Error("video-ended-timeout"));
    }, durationMs);
    const onEnd = () => {
      cleanup();
      resolve();
    };
    const onErr = () => {
      cleanup();
      reject(new Error("video"));
    };
    const cleanup = () => {
      globalThis.clearTimeout(timeout);
      v.removeEventListener("ended", onEnd);
      v.removeEventListener("error", onErr);
    };
    v.addEventListener("ended", onEnd);
    v.addEventListener("error", onErr);
  });
}

function pathnameLower(href: string): string {
  try {
    return new URL(href).pathname.toLowerCase();
  } catch {
    return href.toLowerCase();
  }
}

function shouldUseCanvasBlitForTransparentVideo(href: string): boolean {
  const p = pathnameLower(href);
  return (
    p.endsWith(".webm") ||
    p.endsWith(".mov") ||
    p.endsWith(".m4v") ||
    p.endsWith(".mp4")
  );
}

function enableTextureSourceUpdates(tex: Texture): { tick: () => void } {
  const s = tex.source as { autoUpdate?: boolean; update?: () => void };
  if (typeof s.autoUpdate === "boolean") {
    s.autoUpdate = true;
  }
  return {
    tick: () => {
      s.update?.();
    },
  };
}

function fitVideoSpriteForPhase(
  sp: Sprite,
  tile: Tile,
  pv: TilePlacementVideo,
  phase: "intro" | "loop" | "placed",
  vw: number,
  vh: number,
): void {
  const rect = rectFromPhase(pv, phase, tile);
  const localX = rect.x - tile.position.x;
  const localY = rect.y - tile.position.y;
  sp.anchor.set(0, 0);
  sp.position.set(localX, localY);
  const sc = Math.min(rect.w / Math.max(1, vw), rect.h / Math.max(1, vh));
  sp.scale.set(sc, sc);
}

/** Das Folgevideo kurz vor Intro-Ende starten, da iOS dafür oft ein weiteres Bild benötigt. */
const DOM_INTRO_LOOP_LEAD_SECONDS = 0.12;

async function startDomLoopUnderIntro(
  introVid: HTMLVideoElement,
  loopVid: HTMLVideoElement,
  wrap: HTMLDivElement,
  loop: PlacementVideoPlanPhase,
): Promise<void> {
  preparePlacementVideoForOverlay(loopVid);
  introVid.style.zIndex = "1";
  loopVid.style.zIndex = "0";
  if (loopVid.parentElement !== wrap) {
    wrap.insertBefore(loopVid, introVid);
  }
  try {
    if (loopVid.currentTime > 0.001) {
      loopVid.currentTime = 0;
    }
  } catch {
    /* Ein noch nicht bereites Video verhindert den späteren regulären Start nicht. */
  }
  await loadAndPlay(loopVid, loop.src, true, loop.playbackRate);
}

function releaseDomIntroAfterHandoff(introVid: HTMLVideoElement): void {
  introVid.pause();
  introVid.style.zIndex = "";
  introVid.remove();
  releasePlacementVideo(introVid);
}

/**
 * Verwendet für Intro und Wiederholung zwei vorbereitete Videoelemente.
 * Der Wechsel ohne erneutes Laden vermeidet eine sichtbare Pause auf dem iPhone.
 */
async function runDomPlayback(
  introVid: HTMLVideoElement | null,
  loopVid: HTMLVideoElement,
  host: HTMLElement,
  clip: HTMLDivElement,
  wrap: HTMLDivElement,
  intro: PlacementVideoPlanPhase | null,
  loop: PlacementVideoPlanPhase,
  introRect: DesignRect,
  loopRect: DesignRect,
  cancelled: () => boolean,
  onIntroReleased: () => void,
  placementKey?: string,
): Promise<void> {
  if (intro && introVid) {
    applyClipDesignRect(host, clip, introRect);
    let handoffPromise: Promise<void> | null = null;
    const beginHandoff = (): Promise<void> => {
      if (!handoffPromise) {
        handoffPromise = startDomLoopUnderIntro(
          introVid,
          loopVid,
          wrap,
          loop,
        );
      }
      return handoffPromise;
    };

    try {
      await loadAndPlay(introVid, intro.src, false, intro.playbackRate, true);
      if (cancelled()) return;

      const onNearEnd = () => {
        if (
          !Number.isFinite(introVid.duration) ||
          introVid.duration <= 0 ||
          introVid.currentTime < introVid.duration - DOM_INTRO_LOOP_LEAD_SECONDS
        ) {
          return;
        }
        introVid.removeEventListener("timeupdate", onNearEnd);
        void beginHandoff().catch((error) => {
          logError("placementVideo:domHandoff", error);
        });
      };
      introVid.addEventListener("timeupdate", onNearEnd);

      try {
        await waitVideoEnded(introVid);
      } finally {
        introVid.removeEventListener("timeupdate", onNearEnd);
      }
      if (cancelled()) return;
      await beginHandoff();
    } catch (error) {
      // Intro optional — Loop trotzdem.
      logError("placementVideo:intro", error);
      if (!cancelled()) {
        applyClipDesignRect(host, clip, loopRect);
        preparePlacementVideoForOverlay(loopVid);
        if (loopVid.parentElement !== wrap) {
          wrap.appendChild(loopVid);
        }
        await loadAndPlay(loopVid, loop.src, true, loop.playbackRate);
      }
    }

    completePlacementIntroWait(placementKey);
    if (cancelled()) return;
    if (introVid.parentElement) {
      releaseDomIntroAfterHandoff(introVid);
    } else {
      releasePlacementVideo(introVid);
    }
    onIntroReleased();
    applyClipDesignRect(host, clip, loopRect);
    loopVid.style.zIndex = "";
  } else {
    applyClipDesignRect(host, clip, loopRect);
    await loadAndPlay(loopVid, loop.src, true, loop.playbackRate);
  }

  if (!cancelled()) {
    notifyPlacementLoopStarted(placementKey, loopVid, () => !cancelled());
  }
}

/** Mediencache und verdeckter Decoder-Pool für Platzierungsvideos. */
export function warmPlacementVideosForTiles(tiles: Iterable<Tile>): void {
  preloadPlacementVideosInPool(tiles);
}

async function attachPlacedTransparentVideoDom(
  tile: Tile,
  pv: TilePlacementVideo,
  plan: PlacementVideoPlaybackPlan,
  registerStop: (stop: () => void) => void,
  domHost: HTMLElement,
  placementKey?: string,
): Promise<boolean> {
  const placedRect = rectFromPhase(pv, "placed", tile);
  let playbackPlan = plan;
  let introRect = plan.intro ? rectFromPhase(pv, "intro", tile) : placedRect;
  let loopRect = plan.intro ? rectFromPhase(pv, "loop", tile) : placedRect;
  const overlay = ensureOverlay(domHost);

  let introVid: HTMLVideoElement | null = null;
  let loopVid: HTMLVideoElement;

  if (playbackPlan.intro) {
    try {
      introVid = await acquirePlacementVideo(playbackPlan.intro.src, {
        loop: false,
        role: "overlay",
        preferTileId: tile.id,
        playbackRate: playbackPlan.intro.playbackRate,
      });
    } catch (error) {
      logError("placementVideo:firstPhase", error);
      introVid = null;
      playbackPlan = { intro: null, loop: plan.loop };
      introRect = placedRect;
      loopRect = placedRect;
      completePlacementIntroWait(placementKey);
    }
  }

  try {
    loopVid = await acquirePlacementVideo(playbackPlan.loop.src, {
      loop: true,
      role: introVid ? "hidden" : "overlay",
      preferTileId: tile.id,
      playbackRate: playbackPlan.loop.playbackRate,
    });
  } catch (error) {
    logError("placementVideo:loop", error);
    if (introVid) {
      releasePlacementVideo(introVid);
    }
    completePlacementIntroWait(placementKey);
    return false;
  }

  const startVid = introVid ?? loopVid;
  const initialRect = introVid ? introRect : placedRect;
  const { clip, wrap } = createVideoClip(domHost, initialRect, startVid);
  if (placementKey) {
    clip.dataset.placementKey = placementKey;
  }
  overlay.root.appendChild(clip);
  overlay.clips.add(clip);

  let cancelled = false;
  let stopLoopGuard: (() => void) | null = null;
  let introHeld: HTMLVideoElement | null = introVid;
  const isCancelled = () => cancelled;

  const stop = () => {
    cancelled = true;
    stopLoopGuard?.();
    stopLoopGuard = null;
    completePlacementIntroWait(placementKey);
    clip.remove();
    overlay.clips.delete(clip);
    if (introHeld) {
      releasePlacementVideo(introHeld);
      introHeld = null;
    }
    releasePlacementVideo(loopVid);
  };

  registerStop(stop);

  void runDomPlayback(
    introVid,
    loopVid,
    domHost,
    clip,
    wrap,
    playbackPlan.intro,
    playbackPlan.loop,
    introRect,
    loopRect,
    isCancelled,
    () => {
      introHeld = null;
    },
    placementKey,
  )
    .then(() => {
      if (!isCancelled()) {
        stopLoopGuard = startLoopPlaybackGuard(loopVid, () => !isCancelled());
      }
    })
    .catch(() => {
      stop();
    });

  return true;
}

async function attachPlacedTransparentVideoPixi(
  box: Container,
  tile: Tile,
  pv: TilePlacementVideo,
  plan: PlacementVideoPlaybackPlan,
  app: Application,
  registerStop: (stop: () => void) => void,
  placementKey?: string,
): Promise<boolean> {
  let introVid: HTMLVideoElement | null = null;
  let loopVid: HTMLVideoElement;
  try {
    loopVid = await acquirePlacementVideo(plan.loop.src, {
      loop: true,
      role: "hidden",
      preferTileId: tile.id,
      playbackRate: plan.loop.playbackRate,
    });
  } catch (error) {
    logError("placementVideo:pixiLoop", error);
    return false;
  }

  // Ohne Bilder aus dem verdeckten Pool sofort auf ein sichtbares DOM-Video wechseln.
  if (!isVideoFrameReady(loopVid)) {
    releasePlacementVideo(loopVid);
    return false;
  }

  if (plan.intro) {
    try {
      introVid = await acquirePlacementVideo(plan.intro.src, {
        loop: false,
        role: "hidden",
        preferTileId: tile.id,
        playbackRate: plan.intro.playbackRate,
      });
      if (!isVideoFrameReady(introVid)) {
        releasePlacementVideo(introVid);
        releasePlacementVideo(loopVid);
        return false;
      }
    } catch (error) {
      logError("placementVideo:introFrame", error);
      if (introVid) {
        releasePlacementVideo(introVid);
      }
      releasePlacementVideo(loopVid);
      return false;
    }
  }

  const startVid = introVid ?? loopVid;
  if (!isVideoFrameReady(startVid)) {
    if (introVid) releasePlacementVideo(introVid);
    releasePlacementVideo(loopVid);
    return false;
  }

  let currentVid: HTMLVideoElement = startVid;
  const vw = Math.max(1, startVid.videoWidth || 1);
  const vh = Math.max(1, startVid.videoHeight || 1);
  const useCanvasBlit = shouldUseCanvasBlitForTransparentVideo(plan.loop.src);
  let stopLoopGuard: (() => void) | null = null;

  let texMain: Texture;
  let onTick: () => void;
  /**
   * Kopiert Bilder und wechselt Texturen, ohne deren Größe zu verändern.
   * Intro und Wiederholung können unterschiedliche Bildmaße haben.
   */
  let syncBlitFromVideo: ((v: HTMLVideoElement) => {
    w: number;
    h: number;
    resized: boolean;
  }) | null = null;
  let bindSpriteTexture: ((sp: Sprite) => void) | null = null;
  let destroyInactiveBlitTargets: (() => void) | null = null;

  const initialPhase: "intro" | "loop" | "placed" = introVid
    ? "intro"
    : "placed";
  const loopPhase: "loop" | "placed" = introVid ? "loop" : "placed";

  if (useCanvasBlit) {
    type BlitTarget = {
      canvas: HTMLCanvasElement;
      c2d: CanvasRenderingContext2D;
      texture: Texture;
      tick: () => void;
      w: number;
      h: number;
    };

    const createBlitTarget = (w: number, h: number): BlitTarget | null => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const c2d = canvas.getContext("2d", { alpha: true });
      if (!c2d) return null;
      try {
        const source = new CanvasSource({
          resource: canvas,
          transparent: true,
          alphaMode: "premultiply-alpha-on-upload",
        });
        source.format = "rgba8unorm";
        const texture = new Texture({ source });
        const tick = enableTextureSourceUpdates(texture).tick;
        return { canvas, c2d, texture, tick, w, h };
      } catch (error) {
        logError("placementVideo:texture", error);
        return null;
      }
    };

    const destroyBlitTarget = (t: BlitTarget | null) => {
      if (!t) return;
      t.texture.destroy(true);
    };

    const startW = vw;
    const startH = vh;
    const loopW = Math.max(1, loopVid.videoWidth || startW);
    const loopH = Math.max(1, loopVid.videoHeight || startH);
    const samePixelSize = startW === loopW && startH === loopH;

    const startTarget = createBlitTarget(startW, startH);
    if (!startTarget) {
      if (introVid) releasePlacementVideo(introVid);
      releasePlacementVideo(loopVid);
      return false;
    }

    let loopTarget: BlitTarget | null = null;
    if (introVid && !samePixelSize) {
      loopTarget = createBlitTarget(loopW, loopH);
      if (!loopTarget) {
        destroyBlitTarget(startTarget);
        if (introVid) releasePlacementVideo(introVid);
        releasePlacementVideo(loopVid);
        return false;
      }
    }

    let active: BlitTarget = startTarget;
    texMain = active.texture;

    const drawInto = (target: BlitTarget, v: HTMLVideoElement) => {
      target.c2d.clearRect(0, 0, target.w, target.h);
      target.c2d.drawImage(v, 0, 0, target.w, target.h);
      target.tick();
    };

    let boundSprite: Sprite | null = null;
    bindSpriteTexture = (sp: Sprite) => {
      boundSprite = sp;
      if (sp.texture !== active.texture) {
        sp.texture = active.texture;
      }
    };

    syncBlitFromVideo = (v: HTMLVideoElement) => {
      const w = Math.max(1, v.videoWidth || vw);
      const h = Math.max(1, v.videoHeight || vh);
      const wantLoop =
        Boolean(loopTarget) && v === loopVid && (w !== startW || h !== startH);
      const next = wantLoop && loopTarget ? loopTarget : startTarget;
      const resized = next !== active;
      active = next;
      texMain = active.texture;
      if (boundSprite && !boundSprite.destroyed && boundSprite.texture !== active.texture) {
        boundSprite.texture = active.texture;
      }
      drawInto(active, v);
      return { w: active.w, h: active.h, resized };
    };

    const blit = () => {
      syncBlitFromVideo!(currentVid);
    };
    blit();
    onTick = () => {
      blit();
    };

    destroyInactiveBlitTargets = () => {
      if (loopTarget && active !== loopTarget) {
        destroyBlitTarget(loopTarget);
        loopTarget = null;
      }
      if (active !== startTarget) {
        destroyBlitTarget(startTarget);
      }
    };
  } else {
    if (introVid) releasePlacementVideo(introVid);
    releasePlacementVideo(loopVid);
    return false;
  }

  const mainSp = new Sprite(texMain);
  mainSp.roundPixels = true;
  mainSp.alpha = 0;
  bindSpriteTexture?.(mainSp);
  fitVideoSpriteForPhase(mainSp, tile, pv, initialPhase, vw, vh);
  box.addChild(mainSp);

  app.ticker.add(onTick);

  const stop = () => {
    completePlacementIntroWait(placementKey);
    clearIntroTransitionTimeout();
    stopLoopGuard?.();
    stopLoopGuard = null;
    app.ticker?.remove(onTick);
    if (introVid) {
      introVid.removeEventListener("ended", onIntroEnded);
      introVid.removeEventListener("error", onIntroEnded);
    }
    if (!mainSp.destroyed) {
      if (mainSp.parent === box) box.removeChild(mainSp);
      // Nur die aktive Textur über das Sprite freigeben; das zweite Ziel separat bereinigen.
      mainSp.destroy({ texture: true, textureSource: true });
    }
    destroyInactiveBlitTargets?.();
    requestAnimationFrame(() => {
      if (introVid) releasePlacementVideo(introVid);
      releasePlacementVideo(loopVid);
    });
  };

  const ensureLoopGuard = () => {
    if (!stopLoopGuard) {
      stopLoopGuard = startLoopPlaybackGuard(
        loopVid,
        () => currentVid === loopVid && !mainSp.destroyed,
      );
    }
  };

  const startLoopPlayback = async (): Promise<boolean> => {
    completePlacementIntroWait(placementKey);
    currentVid = loopVid;
    const synced = syncBlitFromVideo?.(loopVid);
    const lw = synced?.w ?? Math.max(1, loopVid.videoWidth || vw);
    const lh = synced?.h ?? Math.max(1, loopVid.videoHeight || vh);
    fitVideoSpriteForPhase(mainSp, tile, pv, loopPhase, lw, lh);
    try {
      loopVid.currentTime = 0;
      const started = await playPlacementVideo(loopVid);
      if (started) {
        ensureLoopGuard();
        notifyPlacementLoopStarted(
          placementKey,
          loopVid,
          () => currentVid === loopVid && !mainSp.destroyed,
        );
      }
      return started;
    } catch (error) {
      logError("placementVideo:switchToLoop", error);
      return false;
    }
  };

  let introTransitionTimeoutId: ReturnType<typeof globalThis.setTimeout> | null =
    null;
  let introTransitionStarted = false;
  const clearIntroTransitionTimeout = () => {
    if (introTransitionTimeoutId != null) {
      globalThis.clearTimeout(introTransitionTimeoutId);
      introTransitionTimeoutId = null;
    }
  };
  const introTransitionDelayMs = (v: HTMLVideoElement) =>
    Number.isFinite(v.duration) && v.duration > 0
      ? Math.max(1_000, v.duration * 1_000 + 1_000)
      : PLACEMENT_INTRO_WAIT_TIMEOUT_MS;

  const onIntroEnded = () => {
    if (introTransitionStarted) {
      return;
    }
    introTransitionStarted = true;
    clearIntroTransitionTimeout();
    if (introVid) {
      introVid.removeEventListener("ended", onIntroEnded);
      introVid.removeEventListener("error", onIntroEnded);
    }
    void startLoopPlayback().then((started) => {
      if (!started) {
        stop();
      }
    });
  };

  registerStop(stop);

  try {
    if (introVid) {
      introVid.addEventListener("ended", onIntroEnded);
      introVid.addEventListener("error", onIntroEnded);
      introTransitionTimeoutId = globalThis.setTimeout(
        onIntroEnded,
        introTransitionDelayMs(introVid),
      );
      if (introVid.ended) {
        introTransitionStarted = true;
        clearIntroTransitionTimeout();
        introVid.removeEventListener("ended", onIntroEnded);
        introVid.removeEventListener("error", onIntroEnded);
        const loopStarted = await startLoopPlayback();
        if (!loopStarted) {
          stop();
          return false;
        }
      } else if (introVid.paused) {
        introVid.currentTime = 0;
        const introStarted = await playPlacementVideo(introVid);
        if (!introStarted) {
          completePlacementIntroWait(placementKey);
          introVid.removeEventListener("ended", onIntroEnded);
          introVid.removeEventListener("error", onIntroEnded);
          clearIntroTransitionTimeout();
          const loopStarted = await startLoopPlayback();
          if (!loopStarted) {
            stop();
            return false;
          }
        }
      }
    } else {
      if (loopVid.paused) {
        loopVid.currentTime = 0;
        const loopStarted = await playPlacementVideo(loopVid);
        if (!loopStarted) {
          stop();
          return false;
        }
      }
      notifyPlacementLoopStarted(
        placementKey,
        loopVid,
        () => currentVid === loopVid && !mainSp.destroyed,
      );
    }
    if (currentVid === loopVid) {
      ensureLoopGuard();
    }
    mainSp.alpha = 1;
  } catch (error) {
    logError("placementVideo:start", error);
    stop();
    completePlacementIntroWait(placementKey);
    return false;
  }

  return true;
}

/**
 * Bilder nur bei sicher erkanntem WebM-Alpha in den Canvas kopieren.
 * Sonst DOM-Videos verwenden: MOV in Safari, WebM in Firefox.
 */
export type PlacedTransparentVideoOptions = {
  /** Direkt Loop-Video (z. B. Ergebnis-Screen), ohne Intro-Phase. */
  skipIntro?: boolean;
};

function isPixiWebGlContextLost(app: Application): boolean {
  const gl = (app.renderer as { gl?: { isContextLost?: () => boolean } }).gl;
  return Boolean(gl?.isContextLost?.());
}

export async function attachPlacedTransparentVideo(
  box: Container,
  tile: Tile,
  app: Application,
  registerStop: (stop: () => void) => void,
  domHost: HTMLElement,
  options?: PlacedTransparentVideoOptions,
  placementKey?: string,
): Promise<boolean> {
  const pv = tile.placementVideo;
  if (!pv) {
    completePlacementIntroWait(placementKey);
    return false;
  }

  const resolved = await resolvePlaybackPlan(pv);
  if (!resolved) {
    completePlacementIntroWait(placementKey);
    return false;
  }
  const plan: PlacementVideoPlaybackPlan = options?.skipIntro
    ? {
        intro: null,
        loop: resolved.loop,
      }
    : resolved;

  if (!plan.intro || options?.skipIntro) {
    completePlacementIntroWait(placementKey);
  }

  const tryDom = () =>
    attachPlacedTransparentVideoDom(
      tile,
      pv,
      plan,
      registerStop,
      domHost,
      placementKey,
    );

  const webGlLost = isPixiWebGlContextLost(app);
  if (canBlitWebmAlphaToCanvas() && !webGlLost) {
    const pixiOk = await attachPlacedTransparentVideoPixi(
      box,
      tile,
      pv,
      plan,
      app,
      registerStop,
      placementKey,
    );
    if (pixiOk) {
      return true;
    }
    markCanvasBlitFailed();
  } else if (webGlLost) {
    markCanvasBlitFailed();
  }

  return tryDom();
}
