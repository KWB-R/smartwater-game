import type { Spritesheet, StrapiMedia, Tile } from "@/features/level/types";

/**
 * Wandelt gebündelte Pfade wie `assets/…` in absolute Same-Origin-URLs um.
 */
export function toSameOriginAbsoluteAssetUrl(url: string): string {
  const s = String(url ?? "").trim();
  if (s === "") return s;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) {
    return s;
  }
  if (s.startsWith("//")) {
    if (typeof window !== "undefined" && window.location?.protocol) {
      return `${window.location.protocol}${s}`;
    }
    return `https:${s}`;
  }
  const un = s.replace(/^\.\//, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    if (s.startsWith("/")) {
      return new URL(s, origin).href;
    }
    if (/^assets\//i.test(un)) {
      return new URL(`/${un}`, origin).href;
    }
  } else if (/^assets\//i.test(un)) {
    return `/${un}`;
  }
  return s;
}

/** Aufgelöste Asset-URLs aus Level-Config / Vite-Bundle. */
export function getLevelAssetUrl(relativePath: string): string {
  const key = String(relativePath ?? "").trim().replace(/^\.\//, "");
  if (key === "") {
    throw new Error("getLevelAssetUrl: leerer Pfad");
  }
  return toSameOriginAbsoluteAssetUrl(key);
}
export function isSpritesheet(
  image: StrapiMedia | Spritesheet,
): image is Spritesheet {
  return (
    typeof image === "object" &&
    image !== null &&
    "frameCount" in image &&
    typeof (image as Spritesheet).frameCount === "number" &&
    (image as Spritesheet).frameCount > 0
  );
}

export function getTileLibraryPreviewMedia(
  tile: Tile,
): StrapiMedia | Spritesheet {
  if (tile.placementVideo?.preview) {
    return tile.placementVideo.preview;
  }
  return tile.image;
}
