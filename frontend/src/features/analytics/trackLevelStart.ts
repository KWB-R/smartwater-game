import { trackAnalyticsEvent } from "@/api/services/analyticsService";
import { utcDayKey } from "@/features/analytics/visitDayKey";

const LEVEL_START_PREFIX = "swg:analytics:levelStart:";

/** Einmal pro Level und Tab-Session. */
export function trackLevelStart(levelSlug: string): void {
  const slug = levelSlug.trim();
  if (!slug || typeof window === "undefined") {
    return;
  }

  try {
    const key = `${LEVEL_START_PREFIX}${slug}`;
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, "1");
  } catch {
    // Ohne Browserspeicher trotzdem senden.
  }

  void trackAnalyticsEvent({
    metric: "level_start",
    day: utcDayKey(),
    levelSlug: slug,
  });
}
