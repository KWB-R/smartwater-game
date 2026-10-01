import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnalyticsConsentBanner } from "@/components/features/analytics/AnalyticsConsentBanner";
import { useAppSettings } from "@/components/layout/appSettingsContext";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsentDecision,
} from "@/features/analytics/analyticsConsent";
import { trackAppOpen } from "@/features/analytics/trackAppOpen";

type AnalyticsConsentContextValue = {
  /** Banner erneut öffnen (z. B. aus Hauptmenü). */
  openConsentBanner: () => void;
  /** Zeigt an, ob ein Einwilligungstext aus dem CMS verfügbar ist. */
  hasConsentContent: boolean;
  decision: AnalyticsConsentDecision | null;
};

const AnalyticsConsentContext =
  createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings();
  const consent = settings.consent;
  const hasConsentContent = consent != null && settings.enabled;

  const [decision, setDecision] = useState<AnalyticsConsentDecision | null>(
    () => readAnalyticsConsent(),
  );
  const [forcedOpen, setForcedOpen] = useState(false);

  const bannerOpen =
    hasConsentContent && (decision == null || forcedOpen);

  const openConsentBanner = useCallback(() => {
    if (!hasConsentContent) {
      return;
    }
    setForcedOpen(true);
  }, [hasConsentContent]);

  const applyDecision = useCallback((next: AnalyticsConsentDecision) => {
    writeAnalyticsConsent(next);
    setDecision(next);
    setForcedOpen(false);
    if (next === "accepted") {
      trackAppOpen();
    }
  }, []);

  const value = useMemo(
    () => ({
      openConsentBanner,
      hasConsentContent,
      decision,
    }),
    [openConsentBanner, hasConsentContent, decision],
  );

  return (
    <AnalyticsConsentContext.Provider value={value}>
      {children}
      {consent != null && settings.enabled ? (
        <AnalyticsConsentBanner
          open={bannerOpen}
          content={consent}
          onAccept={() => applyDecision("accepted")}
          onDeny={() => applyDecision("denied")}
        />
      ) : null}
    </AnalyticsConsentContext.Provider>
  );
}

export function useAnalyticsConsent(): AnalyticsConsentContextValue {
  const ctx = useContext(AnalyticsConsentContext);
  if (!ctx) {
    throw new Error(
      "useAnalyticsConsent must be used within AnalyticsConsentProvider",
    );
  }
  return ctx;
}
