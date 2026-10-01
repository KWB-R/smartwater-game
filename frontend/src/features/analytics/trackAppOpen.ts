import { trackAnalyticsEvent } from "@/api/services/analyticsService";
import { hasAnalyticsConsent } from "@/features/analytics/analyticsConsent";
import { utcDayKey } from "@/features/analytics/visitDayKey";

const UNIQUE_KEY_PREFIX = "swg:analytics:visit:";
const SESSION_KEY = "swg:analytics:session";

/**
 * Zählt einen Besuch pro UTC-Tag und einen Sitzungsstart pro Tab.
 * Ein Neuladen zählt die Sitzung nicht erneut. Nach späterer Einwilligung erneut aufrufen.
 */
export function trackAppOpen(): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) {
    return;
  }

  const day = utcDayKey();

  try {
    const uniqueKey = `${UNIQUE_KEY_PREFIX}${day}`;
    if (!localStorage.getItem(uniqueKey)) {
      localStorage.setItem(uniqueKey, "1");
      void trackAnalyticsEvent({ metric: "unique_visit", day });
    }
  } catch {
    // Bei gesperrtem oder vollem Browserspeicher fortfahren.
  }

  try {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      void trackAnalyticsEvent({ metric: "session_start", day });
    }
  } catch {
    // Bei gesperrtem oder vollem Browserspeicher fortfahren.
  }
}
