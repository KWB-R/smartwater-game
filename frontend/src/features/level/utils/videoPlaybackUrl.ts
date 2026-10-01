import {
  detectWebmAlphaSupport,
  type WebmAlphaDetectResult,
} from "@/features/level/utils/detectWebmAlphaSupport";
import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localStore } from "@/lib/storage/webStorage";

/** Gecachtes Canvas-Ergebnis: `null` = noch nicht gemessen. */
let cachedCanvasVerdict: WebmAlphaDetectResult | null = readPersistedCanvasVerdict();
let detectionPromise: Promise<WebmAlphaDetectResult> | null = null;
let cachedHevcPlayable: boolean | null = null;

function readPersistedCanvasVerdict(): WebmAlphaDetectResult | null {
  const raw = localStore.get(STORAGE_KEYS.webmAlphaSupported);
  if (raw === "supported" || raw === "unsupported" || raw === "unknown") {
    return raw;
  }
  return null;
}

function persistCanvasVerdict(verdict: WebmAlphaDetectResult): void {
  localStore.set(STORAGE_KEYS.webmAlphaSupported, verdict);
}

/** Prüft die Unterstützung transparenter HEVC-/MOV-Videos in Safari. */
function canPlayHevcMov(): boolean {
  if (cachedHevcPlayable !== null) {
    return cachedHevcPlayable;
  }
  if (typeof document === "undefined") {
    cachedHevcPlayable = false;
    return false;
  }
  const video = document.createElement("video");
  const types = ['video/mp4; codecs="hvc1"', 'video/mp4; codecs="hev1"'];
  cachedHevcPlayable = types.some((type) => {
    const result = video.canPlayType(type);
    return result === "probably" || result === "maybe";
  });
  return cachedHevcPlayable;
}

/**
 * MOV nur bei fehlendem Canvas-WebM-Alpha und abspielbarem HEVC verwenden.
 * Ohne HEVC-Unterstützung, etwa in Firefox, bei WebM bleiben.
 */
export function shouldUseWebmPlaybackUrl(
  canvasVerdict: WebmAlphaDetectResult | null,
  hevcPlayable: boolean,
): boolean {
  return !(canvasVerdict === "unsupported" && hevcPlayable);
}

/** Nur bei sicher erkanntem Alpha Bilder in Pixi kopieren; sonst ein DOM-Video verwenden. */
export function shouldBlitWebmAlphaToCanvas(
  canvasVerdict: WebmAlphaDetectResult | null,
): boolean {
  return canvasVerdict === "supported";
}

async function getCanvasAlphaVerdict(): Promise<WebmAlphaDetectResult> {
  if (cachedCanvasVerdict !== null) {
    return cachedCanvasVerdict;
  }
  if (typeof document !== "undefined" && !document.body) {
    return "unknown";
  }
  if (!detectionPromise) {
    detectionPromise = detectWebmAlphaSupport().then((verdict) => {
      if (typeof document === "undefined" || !document.body) {
        detectionPromise = null;
        return verdict;
      }
      cachedCanvasVerdict = verdict;
      persistCanvasVerdict(verdict);
      return verdict;
    });
  }
  return detectionPromise;
}

/**
 * Startet die WebM-Alpha-Erkennung früh (z. B. beim App-Start).
 * Standard-Playback bleibt WebM, bis das Ergebnis da ist.
 */
export function primeWebmAlphaSupportDetection(): void {
  void getWebmAlphaSupported();
}

/**
 * Ob Playback **WebM** nutzen soll (nicht MOV).
 * Einmalig asynchron ermittelt, danach gecacht.
 */
export async function getWebmAlphaSupported(): Promise<boolean> {
  const verdict = await getCanvasAlphaVerdict();
  const hevc =
    verdict === "unsupported" ? canPlayHevcMov() : false;
  return shouldUseWebmPlaybackUrl(verdict, hevc);
}

let canvasBlitFailedThisSession = false;

/** Der Pixi-Kopierpfad ist in dieser Sitzung nicht nutzbar, etwa nach einem verlorenen WebGL-Kontext. */
export function markCanvasBlitFailed(): void {
  canvasBlitFailedThisSession = true;
}

/** Synchroner Entscheid nach getWebmAlphaSupported für Pixi oder DOM-Videos. */
export function canBlitWebmAlphaToCanvas(): boolean {
  return (
    !canvasBlitFailedThisSession &&
    shouldBlitWebmAlphaToCanvas(cachedCanvasVerdict)
  );
}

function pathExt(url: string): string {
  const path = url.split("?")[0]?.split("#")[0] ?? url;
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot).toLowerCase() : "";
}

function pickWithPreference(
  web: string | null,
  mov: string | null,
  useWebm: boolean,
): string | null {
  return useWebm ? web : mov;
}

function currentUseWebmUrl(): boolean {
  const hevc =
    cachedCanvasVerdict === "unsupported" ? canPlayHevcMov() : false;
  return shouldUseWebmPlaybackUrl(cachedCanvasVerdict, hevc);
}

/**
 * Synchrone Wahl: Standard **WebM**, bis die Erkennung fertig ist;
 * MOV nur bei klarem Canvas-Nein plus spielbarem HEVC.
 */
export function pickTransparentVideoPlaybackUrlSync(
  webUrl: string | null | undefined,
  movUrl: string | null | undefined,
): string | null {
  const web = webUrl?.trim() ? webUrl.trim() : null;
  const mov = movUrl?.trim() ? movUrl.trim() : null;

  if (typeof navigator === "undefined") {
    return web ?? mov;
  }

  return pickWithPreference(web, mov, currentUseWebmUrl());
}

/**
 * Wählt die Playback-URL nach WebM-Alpha-Test (WebM bevorzugt, sonst MOV).
 */
export async function pickTransparentVideoPlaybackUrl(
  webUrl: string | null | undefined,
  movUrl: string | null | undefined,
): Promise<string | null> {
  const web = webUrl?.trim() ? webUrl.trim() : null;
  const mov = movUrl?.trim() ? movUrl.trim() : null;

  if (typeof navigator === "undefined") {
    return web ?? mov;
  }

  const useWebm = await getWebmAlphaSupported();
  return pickWithPreference(web, mov, useWebm);
}

/** Gemeinsamer Pfad ohne Dateiendung für zusammengehörige WebM- und MOV-Dateien. */
function transparentVideoBaseKey(url: string): string | null {
  const path = url.split("?")[0]?.split("#")[0] ?? url;
  const match = path.match(/^(.*)\.(webm|mov)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

/**
 * Entfernt parallele WebM/MOV-Varianten — behält nur das Format,
 * das der Browser laut Alpha-Test nutzt.
 */
export function filterPreloadUrlsForVideoPlayback(
  urls: readonly string[],
  useWebm: boolean,
): string[] {
  const result: string[] = [];
  const groupVariants = new Map<string, string[]>();

  for (const url of urls) {
    const baseKey = transparentVideoBaseKey(url);
    if (!baseKey) {
      result.push(url);
      continue;
    }
    const variants = groupVariants.get(baseKey) ?? [];
    variants.push(url);
    groupVariants.set(baseKey, variants);
  }

  for (const variants of groupVariants.values()) {
    const web =
      variants.find((u) => pathExt(u) === ".webm") ??
      variants.find((u) => /\.webm/i.test(u)) ??
      null;
    const mov =
      variants.find((u) => pathExt(u) === ".mov") ??
      variants.find((u) => /\.mov/i.test(u)) ??
      null;
    const picked = pickWithPreference(web, mov, useWebm);
    if (picked) {
      result.push(picked);
    }
  }

  return result;
}

/** Nach `getWebmAlphaSupported()` — eine URL pro transparentem Video-Paar. */
export function pickTransparentVideoPreloadUrl(
  webUrl: string | null | undefined,
  movUrl: string | null | undefined,
  useWebm: boolean,
): string | null {
  const web = webUrl?.trim() ? webUrl.trim() : null;
  const mov = movUrl?.trim() ? movUrl.trim() : null;
  return pickWithPreference(web, mov, useWebm);
}
