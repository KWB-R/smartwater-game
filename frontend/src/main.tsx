import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { OfflineProvider } from "@/hooks/useOfflineStatus";
import { SoundProvider } from "@/hooks/SoundProvider";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";
import { appRouter } from "@/routes/appRouter";
import { trackAppOpen } from "@/features/analytics/trackAppOpen";
import { primeWebmAlphaSupportDetection } from "@/features/level/utils/videoPlaybackUrl";
import { isPwaOfflineEnabled } from "@/lib/pwaEnabled";
import { initPwaDeferredInstallPrompt } from "@/pwa/pwaDeferredInstallPrompt";
import { registerAppServiceWorker } from "@/pwa/serviceWorkerRegistration";
import "./tailwind.css";
import "./index.scss";

function primeWebmAlphaWhenDomReady(): void {
  if (document.body) {
    primeWebmAlphaSupportDetection();
    return;
  }
  window.addEventListener("DOMContentLoaded", () => primeWebmAlphaSupportDetection(), {
    once: true,
  });
}

primeWebmAlphaWhenDomReady();
trackAppOpen();
initPwaDeferredInstallPrompt();

if (isPwaOfflineEnabled()) {
  registerAppServiceWorker();
} else if (import.meta.env.DEV && "serviceWorker" in navigator) {
  /** Ohne VITE_PWA_DEV im normalen Entwicklungsbetrieb keinen Service Worker registrieren. */
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      void registration.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OfflineProvider>
      <SoundProvider>
        <AppErrorBoundary>
          <RouterProvider router={appRouter} />
        </AppErrorBoundary>
      </SoundProvider>
    </OfflineProvider>
  </StrictMode>,
);
