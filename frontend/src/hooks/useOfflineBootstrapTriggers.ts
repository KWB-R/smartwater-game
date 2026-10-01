import { useEffect } from "react";

import { isStandaloneDisplayMode } from "@/pwa/offlineContentSync";
import { readBootstrapCompleted } from "@/pwa/offlineBootstrapStorage";
import { isBrowserOffline } from "@/pwa/offline";

export function useOfflineBootstrapTriggers(
  triggerBootstrap: () => void,
): void {
  useEffect(() => {
    const onInstalled = () => {
      if (!isBrowserOffline()) {
        triggerBootstrap();
      }
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [triggerBootstrap]);

  useEffect(() => {
    if (isBrowserOffline()) {
      return;
    }
    if (!isStandaloneDisplayMode()) {
      return;
    }
    if (readBootstrapCompleted()) {
      return;
    }
    triggerBootstrap();
  }, [triggerBootstrap]);
}
