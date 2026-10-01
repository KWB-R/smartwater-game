import {
  prepareLevelPackage,
  type PrepareLevelPackageInput,
} from "@/features/level/services/prepareLevelPackage";

export type LevelAssetPreloadSnapshot = {
  status: "idle" | "loading" | "done" | "error";
  loaded: number;
  total: number;
  error: boolean;
};

const listeners = new Set<() => void>();
const sessions = new Map<
  string,
  {
    signature: string;
    snapshot: LevelAssetPreloadSnapshot;
    promise: Promise<void> | null;
  }
>();

function emptySnapshot(): LevelAssetPreloadSnapshot {
  return { status: "idle", loaded: 0, total: 0, error: false };
}

/** Stabile Referenz für useSyncExternalStore (kein neues Objekt pro getSnapshot). */
export const LEVEL_ASSET_PRELOAD_IDLE_SNAPSHOT: LevelAssetPreloadSnapshot =
  emptySnapshot();

function notify(): void {
  for (const l of listeners) {
    l();
  }
}

function signatureFor(input: PrepareLevelPackageInput): string {
  return [
    input.levelId.trim(),
    input.levelKey.trim(),
    input.district?.bezirkId ?? "",
    input.assetsFolder ?? "",
  ].join("\0");
}

function isSamePreloadCore(signatureA: string, signatureB: string): boolean {
  const partsA = signatureA.split("\0");
  const partsB = signatureB.split("\0");
  return (
    partsA[0] === partsB[0] &&
    partsA[1] === partsB[1] &&
    partsA[2] === partsB[2]
  );
}

function runBackgroundPreloadTopUp(
  key: string,
  targetSignature: string,
  previousSignature: string,
  input: PrepareLevelPackageInput,
  retainedSnapshot: LevelAssetPreloadSnapshot,
): void {
  const promise = prepareLevelPackage(input).then(
    () => {
      const entry = sessions.get(key);
      if (!entry) {
        return;
      }
      entry.signature = targetSignature;
      entry.snapshot = {
        status: "done",
        loaded: entry.snapshot.total || 1,
        total: entry.snapshot.total || 1,
        error: false,
      };
      entry.promise = null;
      notify();
    },
    () => {
      const entry = sessions.get(key);
      if (!entry) {
        return;
      }
      entry.promise = null;
      notify();
    },
  );

  sessions.set(key, {
    signature: previousSignature,
    snapshot: retainedSnapshot,
    promise,
  });
}

export function subscribeLevelAssetPreload(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLevelAssetPreloadSnapshot(
  levelKey: string,
): LevelAssetPreloadSnapshot {
  return sessions.get(levelKey)?.snapshot ?? LEVEL_ASSET_PRELOAD_IDLE_SNAPSHOT;
}

export function ensureLevelPackagePreload(
  levelKey: string,
  input: PrepareLevelPackageInput,
): void {
  const key = levelKey.trim();
  if (!key || !input.levelId.trim()) {
    return;
  }

  const signature = signatureFor(input);
  const existing = sessions.get(key);
  if (existing?.signature === signature && existing.snapshot.status === "done") {
    return;
  }
  if (
    existing?.signature === signature &&
    existing.snapshot.status === "loading" &&
    existing.promise
  ) {
    return;
  }

  if (
    existing?.snapshot.status === "done" &&
    existing.signature !== signature &&
    isSamePreloadCore(existing.signature, signature)
  ) {
    if (existing.promise) {
      return;
    }
    runBackgroundPreloadTopUp(
      key,
      signature,
      existing.signature,
      input,
      existing.snapshot,
    );
    return;
  }

  const snapshot: LevelAssetPreloadSnapshot = {
    status: "loading",
    loaded: 0,
    total: 1,
    error: false,
  };

  const promise = prepareLevelPackage(input, (progress) => {
    const entry = sessions.get(key);
    if (!entry || entry.signature !== signature) {
      return;
    }
    if (progress.phase === "cms") {
      entry.snapshot = {
        status: "loading",
        loaded: progress.loaded,
        total: Math.max(1, progress.total),
        error: false,
      };
    } else {
      const cmsWeight = 1;
      const assetTotal = Math.max(1, progress.total);
      entry.snapshot = {
        status: "loading",
        loaded: cmsWeight + progress.loaded,
        total: cmsWeight + assetTotal,
        error: false,
      };
    }
    notify();
  }).then(
    () => {
      const entry = sessions.get(key);
      if (!entry || entry.signature !== signature) {
        return;
      }
      entry.snapshot = {
        status: "done",
        loaded: entry.snapshot.total || 1,
        total: entry.snapshot.total || 1,
        error: false,
      };
      entry.promise = null;
      notify();
    },
    () => {
      const entry = sessions.get(key);
      if (!entry || entry.signature !== signature) {
        return;
      }
      entry.snapshot = {
        ...entry.snapshot,
        status: "done",
        error: true,
      };
      entry.promise = null;
      notify();
    },
  );

  sessions.set(key, { signature, snapshot, promise });
  notify();
}

export function levelAssetPreloadReady(levelKey: string): boolean {
  const snap = getLevelAssetPreloadSnapshot(levelKey);
  return snap.status === "done";
}
