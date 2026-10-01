import { useEffect, useState } from "react";
import { LANDSCAPE_FALLBACK_MQ } from "@/lib/touchLandscape";

function readShowLandscapeFallback(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(LANDSCAPE_FALLBACK_MQ).matches;
}

/**
 * true wenn Landscape-Fallback gezeigt werden soll
 * (Touch-Landscape oder niedrige Landscape-Höhe, z. B. DevTools).
 */
export function useShowLandscapeFallback(): boolean {
  const [show, setShow] = useState(readShowLandscapeFallback);

  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_FALLBACK_MQ);
    const sync = () => setShow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return show;
}
