import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useOfflineBootstrapTriggers } from "@/hooks/useOfflineBootstrapTriggers";
import { AppUpdateBanner } from "@/components/layout/AppUpdateBanner";
import { OfflineBootstrapOverlay } from "@/components/layout/OfflineBootstrapOverlay";
import { scheduleContentRevalidationOnFocus } from "@/pwa/contentRevalidation";
import { getOfflineStorageBlockedReason } from "@/lib/offlineStorageContext";
import { isBrowserOffline } from "@/pwa/offline";
import {
  readLastDownloadedBytes,
  readLastSuccessfulSyncAt,
} from "@/pwa/offlineBootstrapStorage";
import {
  getOfflineBootstrapSnapshot,
  runFullOfflineBootstrap,
  subscribeOfflineBootstrap,
} from "@/pwa/offlineContentSync";
import {
  setServiceWorkerUpdateListener,
} from "@/pwa/serviceWorkerRegistration";

type OfflineContextValue = {
  isOffline: boolean;
  offlineStorageBlockedReason: string | null;
  bootstrapSnapshot: ReturnType<typeof getOfflineBootstrapSnapshot>;
  lastSyncAt: string | null;
  lastDownloadedBytes: number;
  triggerOfflineBootstrap: () => void;
  appUpdateAvailable: boolean;
  dismissAppUpdate: () => void;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(() => isBrowserOffline());
  const [appUpdateAvailable, setAppUpdateAvailable] = useState(false);
  const [autoBootstrapVisible, setAutoBootstrapVisible] = useState(false);
  const bootstrapErrorHideTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (bootstrapErrorHideTimerRef.current != null) {
        window.clearTimeout(bootstrapErrorHideTimerRef.current);
      }
    },
    [],
  );

  const bootstrapSnapshot = useSyncExternalStore(
    subscribeOfflineBootstrap,
    getOfflineBootstrapSnapshot,
    getOfflineBootstrapSnapshot,
  );

  const triggerOfflineBootstrap = useCallback(() => {
    if (isBrowserOffline()) {
      return;
    }
    setAutoBootstrapVisible(true);
    void runFullOfflineBootstrap({ trigger: "initial" })
      .catch(() => undefined)
      .finally(() => {
        const snap = getOfflineBootstrapSnapshot();
        if (snap.status === "error") {
          bootstrapErrorHideTimerRef.current = window.setTimeout(() => {
            bootstrapErrorHideTimerRef.current = null;
            setAutoBootstrapVisible(false);
          }, 6_000);
          return;
        }
        setAutoBootstrapVisible(false);
      });
  }, []);

  useOfflineBootstrapTriggers(triggerOfflineBootstrap);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    setServiceWorkerUpdateListener((needRefresh) => {
      setAppUpdateAvailable(needRefresh);
    });
    return () => setServiceWorkerUpdateListener(null);
  }, []);

  useEffect(() => scheduleContentRevalidationOnFocus(), []);

  const dismissAppUpdate = useCallback(() => {
    setAppUpdateAvailable(false);
  }, []);

  const lastDownloadedBytes =
    bootstrapSnapshot.status === "running" ||
    bootstrapSnapshot.status === "done"
      ? bootstrapSnapshot.downloadedBytes
      : readLastDownloadedBytes();

  const offlineStorageBlockedReason = useMemo(
    () => getOfflineStorageBlockedReason(),
    [],
  );

  const value = useMemo(
    (): OfflineContextValue => ({
      isOffline,
      offlineStorageBlockedReason,
      bootstrapSnapshot,
      lastSyncAt: readLastSuccessfulSyncAt(),
      lastDownloadedBytes,
      triggerOfflineBootstrap,
      appUpdateAvailable,
      dismissAppUpdate,
    }),
    [
      isOffline,
      offlineStorageBlockedReason,
      bootstrapSnapshot,
      lastDownloadedBytes,
      triggerOfflineBootstrap,
      appUpdateAvailable,
      dismissAppUpdate,
    ],
  );

  const showBootstrapOverlay =
    bootstrapSnapshot.status === "running" ||
    (autoBootstrapVisible && bootstrapSnapshot.status === "error");

  return (
    <OfflineContext.Provider value={value}>
      {children}
      <OfflineBootstrapOverlay
        snapshot={bootstrapSnapshot}
        visible={showBootstrapOverlay}
      />
      <AppUpdateBanner
        visible={appUpdateAvailable}
        onDismiss={dismissAppUpdate}
      />
    </OfflineContext.Provider>
  );
}

export function useOfflineStatus(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOfflineStatus must be used within OfflineProvider");
  }
  return ctx;
}

export function useReloadOnOnline(reload: () => void): void {
  const { isOffline } = useOfflineStatus();
  // Den vorherigen Wert als Ref halten, damit die Vergleichsprüfung keinen zusätzlichen Render auslöst.

  const wasOfflineRef = useRef(isOffline);

  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;
    if (wasOffline && !isOffline) {
      reload();
    }
  }, [isOffline, reload]);
}
