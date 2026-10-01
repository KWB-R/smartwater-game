import { Rectangle, Texture } from "pixi.js";
import type { Spritesheet, StrapiMedia } from "@/features/level/types";
import { isSpritesheet, toSameOriginAbsoluteAssetUrl } from "@/features/level/services/levelAssetUrls";
import { resolveOfflineMediaPlaybackUrl } from "@/pwa/resolveOfflineMediaPlaybackUrl";

const textureByUrl = new Map<string, Texture>();
const framesBySpritesheetUrl = new Map<string, Texture[]>();

export function isSheet(
  image: StrapiMedia | Spritesheet,
): image is Spritesheet {
  return isSpritesheet(image);
}

/**
 * Löst relative Vite-URLs wie /assets/… mit einer Basis auf.
 * new URL benötigt diese Basis für relative Pfade.
 */
function toAbsoluteImageRequestUrl(url: string): string {
  const s = String(url ?? "").trim();
  if (!s.startsWith("/")) return s;
  if (typeof window === "undefined" || !window.location?.origin) {
    return s;
  }
  return new URL(s, window.location.origin).href;
}

/**
 * Lädt Bilder über HTMLImageElement und Texture.from.
 * Assets.load kann in der Entwicklung abhängig von Parsern und Aliasen keine Textur liefern.
 */
function isValidImageRequestUrl(url: string): boolean {
  const s = String(url).trim();
  if (
    s === "" ||
    s === "undefined" ||
    s === "null" ||
    s === "NaN"
  ) {
    return false;
  }
  if (
    !/^https?:\/\//i.test(s) &&
    !s.startsWith("blob:") &&
    !s.startsWith("data:") &&
    !s.startsWith("/")
  ) {
    return false;
  }
  try {
    const parseInput = s.startsWith("/")
      ? typeof window !== "undefined" && window.location?.origin
        ? new URL(s, window.location.origin)
        : null
      : new URL(s);
    if (!parseInput) {
      return false;
    }
    const last = parseInput.pathname.split("/").pop() ?? "";
    if (last === "undefined" || last === "null") {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export async function loadTextureFromUrl(url: string): Promise<Texture> {
  const raw = toSameOriginAbsoluteAssetUrl(String(url ?? "").trim());
  if (!isValidImageRequestUrl(raw)) {
    throw new Error(
      `loadTextureFromUrl: erwartet http(s)-, /…-, blob- oder data-URL (bekommen: ${JSON.stringify(url)})`,
    );
  }
  const s = toAbsoluteImageRequestUrl(raw);
  const hit = textureByUrl.get(s) ?? textureByUrl.get(raw);
  if (hit) return hit;

  const playbackSrc = await resolveOfflineMediaPlaybackUrl(s);
  const img = new Image();
  img.decoding = "async";
  try {
    if (!playbackSrc.startsWith("blob:")) {
      const u = new URL(
        playbackSrc,
        typeof window !== "undefined" ? window.location.href : "http://localhost/",
      );
      if (
        typeof window === "undefined" ||
        u.origin !== window.location.origin
      ) {
        img.crossOrigin = "anonymous";
      }
    }
  } catch {
    img.crossOrigin = "anonymous";
  }

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () =>
      reject(new Error(`loadTextureFromUrl: Bild konnte nicht geladen werden (${s})`));
    img.src = playbackSrc;
  });

  const t = Texture.from(img);
  textureByUrl.set(s, t);
  textureByUrl.set(raw, t);
  return t;
}

export function spritesheetTextures(
  sheet: Spritesheet,
  base: Texture,
): Texture[] {
  const key = sheet.url;
  const cached = framesBySpritesheetUrl.get(key);
  if (cached) return cached;

  const cols = Math.max(1, sheet.gridColumns);
  const fw = sheet.frameSize.x;
  const fh = sheet.frameSize.y;
  const source = base.source;
  const list: Texture[] = [];
  for (let i = 0; i < sheet.frameCount; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    list.push(
      new Texture({
        source,
        frame: new Rectangle(c * fw, r * fh, fw, fh),
      }),
    );
  }
  framesBySpritesheetUrl.set(key, list);
  return list;
}

/**
 * Gibt Puzzleteiltexturen und GPU-Speicher frei.
 * Spritesheet-Bilder teilen ihre Quelle; zuerst einzelne Bilder, dann die Basistexturen freigeben.
 */
export function clearTileTextureCache(): void {
  for (const frames of framesBySpritesheetUrl.values()) {
    for (const frame of frames) {
      if (!frame.destroyed) {
        frame.destroy(false);
      }
    }
  }
  framesBySpritesheetUrl.clear();

  const destroyed = new Set<Texture>();
  for (const tex of textureByUrl.values()) {
    if (destroyed.has(tex) || tex.destroyed) {
      continue;
    }
    destroyed.add(tex);
    tex.destroy(true);
  }
  textureByUrl.clear();
}
