import { STORAGE_KEYS } from "@/lib/storage/storageKeys";
import { localStore } from "@/lib/storage/webStorage";

function getOfflineBootstrapVersion(): string {
  if (typeof __APP_VERSION__ !== "undefined") {
    return __APP_VERSION__;
  }
  return "local";
}

export function readBootstrapCompleted(): boolean {
  return localStore.get(STORAGE_KEYS.offlineBootstrapCompleted) === "1";
}

export function readLastSuccessfulSyncAt(): string | null {
  return localStore.get(STORAGE_KEYS.offlineLastSyncAt);
}

export function readLastDownloadedBytes(): number {
  const raw = localStore.get(STORAGE_KEYS.offlineLastDownloadedBytes);
  if (!raw) {
    return 0;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseUrlList(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push(item);
    }
  }
  return out;
}

export function readOfflineMediaUrlSet(): string[] {
  return (
    localStore.getJson(STORAGE_KEYS.offlineMediaUrlSet, parseUrlList) ?? []
  );
}

export function writeOfflineMediaUrlSet(urls: readonly string[]): void {
  localStore.setJson(STORAGE_KEYS.offlineMediaUrlSet, [...urls]);
}

export function readCmsMediaFingerprint(): string | null {
  return localStore.get(STORAGE_KEYS.offlineCmsMediaFingerprint);
}

export function writeCmsMediaFingerprint(fingerprint: string): void {
  localStore.set(STORAGE_KEYS.offlineCmsMediaFingerprint, fingerprint);
}

/** Sortierte absolute CMS-Medien-URLs als Vergleichswert für den kurzen Inhaltsabgleich. */
export function buildCmsMediaFingerprint(urls: readonly string[]): string {
  const absolute = new Set<string>();
  for (const url of urls) {
    const trimmed = String(url ?? "").trim();
    if (!trimmed) {
      continue;
    }
    try {
      absolute.add(
        new URL(
          trimmed,
          typeof window !== "undefined" ? window.location.href : undefined,
        ).href,
      );
    } catch {
      absolute.add(trimmed);
    }
  }
  return [...absolute].sort().join("\n");
}

export function cmsMediaFingerprintMismatch(fingerprint: string): boolean {
  const stored = readCmsMediaFingerprint();
  if (!stored) {
    return false;
  }
  return stored !== fingerprint;
}

export function markBootstrapSuccess(downloadedBytes: number): void {
  localStore.set(STORAGE_KEYS.offlineBootstrapCompleted, "1");
  localStore.set(STORAGE_KEYS.offlineLastSyncAt, new Date().toISOString());
  localStore.set(
    STORAGE_KEYS.offlineBootstrapVersion,
    getOfflineBootstrapVersion(),
  );
  if (downloadedBytes > 0) {
    localStore.set(
      STORAGE_KEYS.offlineLastDownloadedBytes,
      String(Math.floor(downloadedBytes)),
    );
  }
}

export function bootstrapVersionMismatch(): boolean {
  const stored = localStore.get(STORAGE_KEYS.offlineBootstrapVersion);
  if (!stored) {
    return false;
  }
  return stored !== getOfflineBootstrapVersion();
}
