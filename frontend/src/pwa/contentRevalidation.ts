import { fetchDistricts } from "@/api/services/bezirkService";
import { fetchMissionBonusCatalog } from "@/api/services/missionService";
import { collectGlobalStrapiMediaUrls } from "@/features/level/services/prepareLevelPackage";
import { isBrowserOffline } from "@/pwa/offline";
import {
  isStandaloneDisplayMode,
  runFullOfflineBootstrap,
  type OfflineBootstrapTrigger,
} from "@/pwa/offlineContentSync";
import {
  bootstrapVersionMismatch,
  buildCmsMediaFingerprint,
  cmsMediaFingerprintMismatch,
  readBootstrapCompleted,
  readCmsMediaFingerprint,
  writeCmsMediaFingerprint,
} from "@/pwa/offlineBootstrapStorage";

const REVALIDATE_DEBOUNCE_MS = 8_000;
let lastRunAt = 0;
let revalidatePromise: Promise<void> | null = null;

async function lightRevalidate(): Promise<{ cmsFingerprintChanged: boolean }> {
  const [districts, missionCatalog] = await Promise.all([
    fetchDistricts(),
    fetchMissionBonusCatalog(),
  ]);
  const fingerprint = buildCmsMediaFingerprint(
    collectGlobalStrapiMediaUrls(districts, missionCatalog),
  );
  const stored = readCmsMediaFingerprint();
  if (!stored) {
    // Beim ersten kurzen Abgleich den Vergleichswert speichern, ohne einen vollständigen Neuaufbau auszulösen.
    if (readBootstrapCompleted()) {
      writeCmsMediaFingerprint(fingerprint);
    }
    return { cmsFingerprintChanged: false };
  }
  return { cmsFingerprintChanged: cmsMediaFingerprintMismatch(fingerprint) };
}

async function revalidateOfflineContentIfNeeded(
  options: { full?: boolean } = {},
): Promise<void> {
  if (isBrowserOffline()) {
    return;
  }
  const now = Date.now();
  if (now - lastRunAt < REVALIDATE_DEBOUNCE_MS && !options.full) {
    return;
  }
  if (revalidatePromise) {
    return revalidatePromise;
  }

  lastRunAt = now;
  revalidatePromise = (async () => {
    try {
      const { cmsFingerprintChanged } = await lightRevalidate();
      const versionMismatch = bootstrapVersionMismatch();
      const needsInitial =
        isStandaloneDisplayMode() && !readBootstrapCompleted();

      let trigger: OfflineBootstrapTrigger | null = null;
      if (options.full || needsInitial) {
        trigger = "initial";
      } else if (versionMismatch) {
        trigger = "version";
      } else if (cmsFingerprintChanged) {
        trigger = "cmsFingerprint";
      }

      if (trigger) {
        await runFullOfflineBootstrap({ trigger });
      }
    } catch {
      // Ein fehlgeschlagener Abgleich darf die Offline-Nutzung nicht unterbrechen.
    } finally {
      revalidatePromise = null;
    }
  })();

  return revalidatePromise;
}

export function scheduleContentRevalidationOnFocus(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onFocus = () => {
    void revalidateOfflineContentIfNeeded();
  };
  const onOnline = () => {
    void revalidateOfflineContentIfNeeded({ full: false });
  };

  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);

  return () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("online", onOnline);
  };
}
