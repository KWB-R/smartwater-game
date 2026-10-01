import { useEffect } from "react";

const META_ATTR = "data-swg-analytics-robots";

/** Suchmaschinenindexierung während der Anzeige der Statistikseite deaktivieren. */
export function useAnalyticsNoIndex(): void {
  useEffect(() => {
    const existing = document.querySelector(`meta[${META_ATTR}]`);
    if (existing) {
      return () => {
        existing.remove();
      };
    }
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    meta.setAttribute(META_ATTR, "1");
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
}
