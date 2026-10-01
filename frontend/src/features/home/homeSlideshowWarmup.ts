import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { preloadImageDecode } from "@/features/level/utils/preloadImageDecode";
import type { HomepageSlide } from "@/types/content";

const warmedPosterUrls = new Set<string>();
const videosByUrl = new Map<string, HTMLVideoElement>();

let poolRoot: HTMLDivElement | null = null;

function ensurePoolRoot(): HTMLDivElement {
  if (!poolRoot) {
    poolRoot = document.createElement("div");
    poolRoot.setAttribute("aria-hidden", "true");
    poolRoot.setAttribute("data-home-slideshow-video-pool", "");
    poolRoot.style.cssText =
      "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0";
    document.body.appendChild(poolRoot);
  }
  return poolRoot;
}

function applyVideoPoster(video: HTMLVideoElement, posterUrl: string | null): void {
  if (posterUrl) {
    video.poster = posterUrl;
  }
}

/** Bereitet pro URL ein Video auf der Startseite vor; die Slideshow übernimmt dasselbe Element. */
function ensureHomeSlideshowVideo(
  url: string,
  posterUrl: string | null,
): HTMLVideoElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const existing = videosByUrl.get(url);
  if (existing) {
    applyVideoPoster(existing, posterUrl);
    return existing;
  }

  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.preload = "auto";
  const crossOrigin = strapiImgCrossOrigin(url);
  if (crossOrigin) {
    video.crossOrigin = crossOrigin;
  }
  applyVideoPoster(video, posterUrl);
  video.src = url;
  video.className = "home-slideshow__media home-slideshow__media--hidden";
  videosByUrl.set(url, video);
  ensurePoolRoot().appendChild(video);
  video.load();
  return video;
}

export function attachHomeSlideshowVideo(
  url: string,
  host: HTMLElement,
  posterUrl: string | null,
): HTMLVideoElement | null {
  const video = ensureHomeSlideshowVideo(url, posterUrl);
  if (!video) {
    return null;
  }
  if (video.parentElement !== host) {
    host.appendChild(video);
  }
  return video;
}

function warmPosterUrl(url: string): void {
  if (warmedPosterUrls.has(url) || typeof document === "undefined") {
    return;
  }
  warmedPosterUrls.add(url);
  void preloadImageDecode(url).catch(() => {});
}

/** Lädt Slideshow-Bilder und -Videos bereits auf der Startseite vor. */
export function warmHomepageSlideshowSlides(slides: HomepageSlide[]): void {
  for (const slide of slides) {
    if (slide.mediaKind === "video") {
      ensureHomeSlideshowVideo(slide.mediaUrl, slide.posterUrl);
      if (slide.posterUrl) {
        warmPosterUrl(slide.posterUrl);
      }
    } else {
      warmPosterUrl(slide.mediaUrl);
    }
  }
}
