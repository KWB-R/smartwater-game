import type { Tile } from "@/features/level/types";
import { logError } from "@/lib/logError";
import { getWebmAlphaSupported } from "@/features/level/utils/videoPlaybackUrl";
import { applyOptionalVideoPlaybackRate } from "@/features/level/utils/videoPlaybackRate";
import {
  resolveMediaPlaybackUrlSync,
  resolveOfflineMediaPlaybackUrl,
} from "@/pwa/resolveOfflineMediaPlaybackUrl";
import {
  isVideoFrameReady,
  listPlacementVideoPlanPhases,
  type PlacementVideoPlanPhase,
  resolvePlacementVideoPlaybackPlan,
} from "./placementVideoMedia";

type PlacementVideoRef = PlacementVideoPlanPhase;

function listPlacementVideoRefsForTile(tile: Tile): PlacementVideoRef[] {
  const pv = tile.placementVideo;
  if (!pv) return [];
  const plan = resolvePlacementVideoPlaybackPlan(pv);
  return plan ? listPlacementVideoPlanPhases(plan) : [];
}

type VideoRole = "hidden" | "overlay";

type PooledVideo = {
  logicalSrc: string;
  resolvedSrc: string | null;
  element: HTMLVideoElement;
  inUse: boolean;
  primedTileId: number | null;
  reservedTileId: number | null;
};

const poolBySrc = new Map<string, PooledVideo[]>();
const entryByElement = new WeakMap<HTMLVideoElement, PooledVideo>();

let hiddenPoolRoot: HTMLDivElement | null = null;
let poolMountHost: HTMLElement | null = null;

/** Pool im sichtbaren Designrahmen; iOS spielt winzige, fixierte Elemente im body oft nicht ab. */
export function bindPlacementVideoPoolHost(host: HTMLElement | null): void {
  poolMountHost = host;
  if (hiddenPoolRoot && host && hiddenPoolRoot.parentElement !== host) {
    host.appendChild(hiddenPoolRoot);
  }
}

function ensureHiddenPoolRoot(): HTMLDivElement {
  if (!hiddenPoolRoot) {
    hiddenPoolRoot = document.createElement("div");
    hiddenPoolRoot.setAttribute("aria-hidden", "true");
    hiddenPoolRoot.setAttribute("data-level-video-pool", "");
    hiddenPoolRoot.style.cssText =
      "position:absolute;left:0;top:0;width:64px;height:64px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:0;";
    const parent = poolMountHost ?? document.body;
    parent.appendChild(hiddenPoolRoot);
  }
  return hiddenPoolRoot;
}

function mountInHiddenPool(v: HTMLVideoElement): void {
  const pool = ensureHiddenPoolRoot();
  if (v.parentElement !== pool) {
    pool.appendChild(v);
  }
  v.style.width = "100%";
  v.style.height = "100%";
}

function createBaseVideo(loop: boolean): HTMLVideoElement {
  const v = document.createElement("video");
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.playsInline = true;
  v.setAttribute("playsinline", "true");
  v.setAttribute("webkit-playsinline", "true");
  v.setAttribute("x-webkit-airplay", "deny");
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  v.disablePictureInPicture = true;
  v.setAttribute("disablepictureinpicture", "");
  v.draggable = false;
  v.setAttribute("draggable", "false");
  v.controls = false;
  v.loop = loop;
  if (loop) {
    v.setAttribute("loop", "");
  } else {
    v.removeAttribute("loop");
  }
  return v;
}

function applyOverlayPresentation(v: HTMLVideoElement): void {
  v.className = "level-placement-video-overlay__video";
  v.style.display = "block";
  v.style.width = "100%";
  v.style.height = "100%";
  v.style.objectFit = "contain";
  v.style.objectPosition = "top left";
  v.style.background = "transparent";
}

function clearOverlayPresentation(v: HTMLVideoElement): void {
  v.className = "";
  v.style.cssText = "";
}

function syncApplyLogicalSrc(
  entry: PooledVideo,
  ref: PlacementVideoRef,
): void {
  const { element: v } = entry;
  applyOptionalVideoPlaybackRate(v, ref.playbackRate);
  const resolved = resolveMediaPlaybackUrlSync(ref.src);
  v.loop = ref.loop;
  if (ref.loop) {
    v.setAttribute("loop", "");
  } else {
    v.removeAttribute("loop");
  }
  entry.logicalSrc = ref.src;
  if (v.src !== resolved) {
    entry.resolvedSrc = resolved;
    v.src = resolved;
    v.load();
  } else {
    entry.resolvedSrc = resolved;
  }
}

async function applyLogicalSrc(
  entry: PooledVideo,
  ref: PlacementVideoRef,
): Promise<void> {
  const v = entry.element;
  const keepPlaying =
    !v.paused &&
    entry.logicalSrc === ref.src &&
    isVideoFrameReady(v);

  if (!keepPlaying) {
    syncApplyLogicalSrc(entry, ref);
  } else {
    applyOptionalVideoPlaybackRate(v, ref.playbackRate);
    v.loop = ref.loop;
    if (ref.loop) {
      v.setAttribute("loop", "");
    } else {
      v.removeAttribute("loop");
    }
    entry.logicalSrc = ref.src;
  }

  const resolved = await resolveOfflineMediaPlaybackUrl(ref.src);
  if (keepPlaying && (v.src === resolved || v.currentSrc === resolved)) {
    entry.resolvedSrc = resolved;
    return;
  }

  if (v.src !== resolved) {
    entry.resolvedSrc = resolved;
    v.src = resolved;
    v.load();
  } else {
    entry.resolvedSrc = resolved;
  }
}

type PrimeMode = "unlock" | "play";

function runPrimeOnElement(v: HTMLVideoElement, mode: PrimeMode): void {
  const afterPlay = () => {
    if (mode === "unlock") {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* Fehler beim Freigeben des Videos beeinträchtigen den restlichen Pool nicht. */
      }
    }
  };
  void v.play().then(afterPlay).catch(() => {});
}

function tryPrimeElement(v: HTMLVideoElement, mode: PrimeMode): void {
  if (v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (mode === "play") {
      try {
        v.currentTime = 0;
      } catch {
        /* Fehler beim Freigeben des Videos beeinträchtigen den restlichen Pool nicht. */
      }
    }
    runPrimeOnElement(v, mode);
    return;
  }
  v.addEventListener(
    "canplay",
    () => {
      if (mode === "play") {
        try {
          v.currentTime = 0;
        } catch {
          /* Fehler beim Freigeben des Videos beeinträchtigen den restlichen Pool nicht. */
        }
      }
      runPrimeOnElement(v, mode);
    },
    { once: true },
  );
}

function findCommitReservedEntry(
  logicalSrc: string,
  tileId: number,
): PooledVideo | undefined {
  return poolBySrc.get(logicalSrc)?.find(
    (e) => e.inUse && e.reservedTileId === tileId,
  );
}

function pickOrCreateEntry(
  logicalSrc: string,
  loop: boolean,
  preferTileId?: number,
): PooledVideo {
  const list = poolBySrc.get(logicalSrc) ?? [];
  if (!poolBySrc.has(logicalSrc)) {
    poolBySrc.set(logicalSrc, list);
  }

  const free = list.filter((e) => !e.inUse);
  const preferred =
    preferTileId != null
      ? free.find((e) => e.primedTileId === preferTileId)
      : undefined;
  const entry = preferred ?? free[0];
  if (entry) {
    return entry;
  }

  const element = createBaseVideo(loop);
  mountInHiddenPool(element);
  const created: PooledVideo = {
    logicalSrc,
    resolvedSrc: null,
    element,
    inUse: false,
    primedTileId: null,
    reservedTileId: null,
  };
  list.push(created);
  entryByElement.set(element, created);
  return created;
}

function primeRefOnTile(ref: PlacementVideoRef, tileId: number, mode: PrimeMode): void {
  const entry = pickOrCreateEntry(ref.src, ref.loop, tileId);
  if (entry.inUse) {
    return;
  }
  entry.primedTileId = tileId;
  syncApplyLogicalSrc(entry, ref);
  tryPrimeElement(entry.element, mode);
  void applyLogicalSrc(entry, ref).then(() => {
    tryPrimeElement(entry.element, mode);
  });
}

async function ensureEntryLoaded(ref: PlacementVideoRef): Promise<PooledVideo> {
  const entry = pickOrCreateEntry(ref.src, ref.loop);
  await applyLogicalSrc(entry, ref);
  return entry;
}

/** Bereitet Decoder im verdeckten Pool vor. Die Mediendaten stammen bereits aus dem Levelcache. */
export function preloadPlacementVideosInPool(tiles: Iterable<Tile>): void {
  void getWebmAlphaSupported().then(() => {
    const seen = new Set<string>();
    for (const tile of tiles) {
      for (const ref of listPlacementVideoRefsForTile(tile)) {
        if (seen.has(ref.src)) continue;
        seen.add(ref.src);
        void ensureEntryLoaded(ref).catch(() => {});
      }
    }
  });
}

/**
 * Entsperrt Decoder und Wiedergabe während einer direkten Nutzeraktion.
 */
export function primePlacementVideosForTile(tile: Tile): void {
  for (const ref of listPlacementVideoRefsForTile(tile)) {
    primeRefOnTile(ref, tile.id, "unlock");
  }
}

/**
 * Startet das Video noch beim Loslassen des Zeigers, solange die Nutzeraktion die Wiedergabe erlaubt.
 */
export function startPlacementVideoOnUserCommit(tile: Tile): void {
  const refs = listPlacementVideoRefsForTile(tile);
  const introRef = refs.find((r) => !r.loop);
  const loopRef = refs.find((r) => r.loop);
  const playRef = introRef ?? loopRef;
  if (!playRef) {
    return;
  }

  const entry = pickOrCreateEntry(playRef.src, playRef.loop, tile.id);
  entry.primedTileId = tile.id;
  entry.reservedTileId = tile.id;
  entry.inUse = true;
  syncApplyLogicalSrc(entry, playRef);
  tryPrimeElement(entry.element, "play");

  if (loopRef && introRef) {
    primeRefOnTile(loopRef, tile.id, "unlock");
  }
}

/** Ungültiges Ablegen: Reservierung im Pool wieder freigeben. */
export function cancelPlacementVideoCommitForTile(tile: Tile): void {
  for (const list of poolBySrc.values()) {
    for (const entry of list) {
      if (entry.reservedTileId !== tile.id) {
        continue;
      }
      entry.element.pause();
      try {
        entry.element.currentTime = 0;
      } catch (error) {
        logError("placementVideoPool:seek", error);
      }
      entry.inUse = false;
      entry.reservedTileId = null;
      entry.primedTileId = null;
      clearOverlayPresentation(entry.element);
      mountInHiddenPool(entry.element);
    }
  }
}

export async function acquirePlacementVideo(
  logicalSrc: string,
  options: {
    loop: boolean;
    role: VideoRole;
    preferTileId?: number;
    playbackRate?: number;
  },
): Promise<HTMLVideoElement> {
  const reserved =
    options.preferTileId != null
      ? findCommitReservedEntry(logicalSrc, options.preferTileId)
      : undefined;
  const entry =
    reserved ??
    pickOrCreateEntry(logicalSrc, options.loop, options.preferTileId);
  entry.inUse = true;
  entry.reservedTileId = null;
  entry.primedTileId = null;
  const ref: PlacementVideoRef = {
    src: logicalSrc,
    loop: options.loop,
    ...(options.playbackRate !== undefined
      ? { playbackRate: options.playbackRate }
      : {}),
  };
  await applyLogicalSrc(entry, ref);

  const v = entry.element;
  if (options.role === "overlay") {
    applyOverlayPresentation(v);
  } else {
    clearOverlayPresentation(v);
    mountInHiddenPool(v);
  }
  return v;
}

/** Aktualisiert die Darstellung, ohne beim Videowechsel das Elternelement zu wechseln. */
export function preparePlacementVideoForOverlay(v: HTMLVideoElement): void {
  applyOverlayPresentation(v);
}

export function releasePlacementVideo(v: HTMLVideoElement): void {
  const entry = entryByElement.get(v);
  if (!entry) {
    v.pause();
    v.remove();
    return;
  }
  v.pause();
  clearOverlayPresentation(v);
  entry.inUse = false;
  entry.primedTileId = null;
  entry.reservedTileId = null;
  mountInHiddenPool(v);
}

export function teardownPlacementVideoPool(): void {
  for (const list of poolBySrc.values()) {
    for (const { element } of list) {
      element.pause();
      element.removeAttribute("src");
      void element.load();
      element.remove();
    }
  }
  poolBySrc.clear();
  hiddenPoolRoot?.remove();
  hiddenPoolRoot = null;
  poolMountHost = null;
}
