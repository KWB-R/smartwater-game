import { trackAnalyticsEvent } from "@/api/services/analyticsService";
import { utcDayKey } from "@/features/analytics/visitDayKey";

const STORAGE_KEY = "swg:analytics:allLevelsComplete";

/**
 * Zählt den Abschluss aller Hauptlevel einmal pro Browser.
 * Die lokale Markierung verhindert Wiederholungen; eine Benutzer-ID wird nicht übertragen.
 */
export function trackAllLevelsComplete(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (localStorage.getItem(STORAGE_KEY)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Ohne Browserspeicher trotzdem senden; eine spätere Wiederholung kann erneut zählen.
  }

  void trackAnalyticsEvent({
    metric: "all_levels_complete",
    day: utcDayKey(),
  });
}
