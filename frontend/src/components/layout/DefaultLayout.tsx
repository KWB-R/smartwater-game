import { Navigate, useLocation } from "react-router-dom";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { PlaceholderPage } from "@/routes/placeholder/PlaceholderPage";
import { AnalyticsConsentProvider } from "./analyticsConsentContext";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { AppSettingsProvider, useAppSettings } from "./appSettingsContext";
import { Header } from "./Header";
import { LandscapeFallbackScreen } from "./LandscapeFallbackScreen";
import { MainMenuProvider } from "./mainMenuContext";
import { SkipToMainContentLink } from "./SkipToMainContentLink";
import { MAIN_CONTENT_ID } from "@/lib/mainContent";
import "./layout.scss";

function DefaultLayoutBody() {
  const { isOffline, offlineStorageBlockedReason } = useOfflineStatus();
  const { settings } = useAppSettings();
  const { pathname } = useLocation();

  if (!settings.enabled) {
    if (pathname !== "/") {
      return <Navigate to="/" replace />;
    }
    return (
      <div className="default">
        <SkipToMainContentLink />
        <Header />
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="default__main">
          <PlaceholderPage />
        </main>
        <LandscapeFallbackScreen />
      </div>
    );
  }

  return (
    <div className="default">
      <SkipToMainContentLink />
      {offlineStorageBlockedReason ? (
        <div className="default__offline" role="alert">
          {offlineStorageBlockedReason}
        </div>
      ) : null}
      {isOffline ? (
        <div className="default__offline" role="status">
          Offline Modus aktiviert.
        </div>
      ) : null}
      <Header />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="default__main">
        <AnimatedOutlet />
      </main>
      <LandscapeFallbackScreen />
    </div>
  );
}

export function DefaultLayout() {
  return (
    <AppSettingsProvider>
      <AnalyticsConsentProvider>
        <MainMenuProvider>
          <DefaultLayoutBody />
        </MainMenuProvider>
      </AnalyticsConsentProvider>
    </AppSettingsProvider>
  );
}
