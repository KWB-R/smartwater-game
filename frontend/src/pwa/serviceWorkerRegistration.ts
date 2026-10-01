import { isPwaOfflineEnabled } from "@/lib/pwaEnabled";
import { registerSW } from "virtual:pwa-register";

type SwUpdateListener = (needRefresh: boolean) => void;

let updateListener: SwUpdateListener | null = null;
let applyUpdateFn: (() => void) | null = null;
let serviceWorkerRegistered = false;

export function setServiceWorkerUpdateListener(listener: SwUpdateListener | null): void {
  updateListener = listener;
  if (listener && applyUpdateFn) {
    listener(true);
  }
}

export function applyPendingServiceWorkerUpdate(): void {
  applyUpdateFn?.();
}

const DEFAULT_SW_READY_TIMEOUT_MS = 12_000;

/**
 * Wartet auf einen aktiven Service Worker und bricht bei Registrierungsfehlern ab.
 * Andernfalls könnte navigator.serviceWorker.ready dauerhaft offen bleiben.
 */
export async function waitForServiceWorkerReady(
  timeoutMs = DEFAULT_SW_READY_TIMEOUT_MS,
): Promise<{ activated: boolean }> {
  if (!isPwaOfflineEnabled() || !("serviceWorker" in navigator)) {
    return { activated: false };
  }
  if (navigator.serviceWorker.controller) {
    return { activated: true };
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.active) {
    return { activated: true };
  }
  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
  const activated = Boolean(
    navigator.serviceWorker.controller ?? registration?.active,
  );
  return { activated };
}

export function registerAppServiceWorker(): void {
  if (!isPwaOfflineEnabled() || !("serviceWorker" in navigator)) {
    return;
  }
  if (serviceWorkerRegistered) {
    return;
  }
  serviceWorkerRegistered = true;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloadingForUpdate) {
      return;
    }
    reloadingForUpdate = true;
    window.location.reload();
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      applyUpdateFn = () => {
        void updateSW(true);
      };
      updateListener?.(true);
      void updateSW(true);
    },
    onOfflineReady() {
      // Die App-Dateien liegen im Vorabcache; der vollständige CMS-Abgleich läuft separat.
    },
    onRegistered(registration) {
      if (!registration) {
        return;
      }

      const checkForUpdate = () => {
        if (document.visibilityState === "visible" && navigator.onLine) {
          void registration.update();
        }
      };

      checkForUpdate();
      window.addEventListener("online", checkForUpdate);
      document.addEventListener("visibilitychange", checkForUpdate);
    },
    onRegisterError(error) {
      console.error("[pwa] Service-Worker-Registrierung fehlgeschlagen:", error);
    },
  });
}
