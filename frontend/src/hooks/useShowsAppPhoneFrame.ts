import { useEffect, useState } from "react";
import { usesFullAppViewport } from "@/lib/appViewport";
import { LANDSCAPE_FALLBACK_MQ } from "@/lib/touchLandscape";

/** Gleiche Schwelle wie `#app-viewport` Phone-Rahmen in `_root.scss`. */
const DESKTOP_FRAME_MQ = "(min-width: 768px)";

function readShowsAppPhoneFrame(pathname: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (usesFullAppViewport(pathname)) {
    return false;
  }
  if (!window.matchMedia(DESKTOP_FRAME_MQ).matches) {
    return false;
  }
  // Im Querformat oder beim Querformathinweis den Smartphone-Rahmen ausblenden.
  if (window.matchMedia(LANDSCAPE_FALLBACK_MQ).matches) {
    return false;
  }
  return true;
}

/** true, wenn der Smartphone-Rahmen für größere Ansichten sichtbar ist. */
export function useShowsAppPhoneFrame(pathname: string): boolean {
  const [shows, setShows] = useState(() => readShowsAppPhoneFrame(pathname));

  useEffect(() => {
    const desktopMq = window.matchMedia(DESKTOP_FRAME_MQ);
    const landscapeFallbackMq = window.matchMedia(LANDSCAPE_FALLBACK_MQ);

    const sync = () => setShows(readShowsAppPhoneFrame(pathname));
    sync();

    desktopMq.addEventListener("change", sync);
    landscapeFallbackMq.addEventListener("change", sync);
    return () => {
      desktopMq.removeEventListener("change", sync);
      landscapeFallbackMq.removeEventListener("change", sync);
    };
  }, [pathname]);

  return shows;
}
