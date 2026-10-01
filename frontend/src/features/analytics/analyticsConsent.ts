/** Speichert die Statistik-Einwilligung im localStorage. */

export type AnalyticsConsentDecision = "accepted" | "denied";

const STORAGE_KEY = "swg:analytics:consent";

export function readAnalyticsConsent(): AnalyticsConsentDecision | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "accepted" || raw === "denied") {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(decision: AnalyticsConsentDecision): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, decision);
  } catch {
    // Bei gesperrtem oder vollem Browserspeicher fortfahren.
  }
}

/** Statistik nur nach ausdrücklicher Zustimmung erfassen. */
export function hasAnalyticsConsent(): boolean {
  return readAnalyticsConsent() === "accepted";
}
