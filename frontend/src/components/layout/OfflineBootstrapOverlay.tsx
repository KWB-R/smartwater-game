import { OverlayPortal } from "@/components/ui/OverlayPortal";

import type { OfflineBootstrapSnapshot } from "@/pwa/offlineContentSync";

type OfflineBootstrapOverlayProps = {
  snapshot: OfflineBootstrapSnapshot;
  visible: boolean;
};

function phaseLabel(phase: OfflineBootstrapSnapshot["phase"]): string {
  switch (phase) {
    case "global":
    case "districts":
    case "levels":
      return "Inhalte werden vorbereitet…";
    case "priority":
      return "Aktuelle Level werden offline geladen…";
    case "background":
      return "Weitere Level werden im Hintergrund geladen…";
    default:
      return "Offline-Vorbereitung…";
  }
}

/** Banner für Fortschritt und Fehler beim Offline-Abgleich; die App bleibt bedienbar. */
export function OfflineBootstrapOverlay({
  snapshot,
  visible,
}: OfflineBootstrapOverlayProps) {
  if (!visible) {
    return null;
  }

  if (snapshot.status === "error") {
    return (
      <OverlayPortal>
        <div
          className="absolute inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-(--z-update-banner) flex justify-center px-4"
          role="alert"
        >
          <div className="w-full max-w-md rounded-xl bg-white px-4 py-3 text-center font-text text-sm text-swg-blue-dark shadow-lg">
            <p className="m-0 font-base">Offline-Vorbereitung fehlgeschlagen.</p>
            {snapshot.message ? (
              <p className="m-0 mt-1 text-[0.8125rem] opacity-85">
                {snapshot.message}
              </p>
            ) : null}
          </div>
        </div>
      </OverlayPortal>
    );
  }

  if (snapshot.status !== "running") {
    return null;
  }

  const progress =
    snapshot.total > 0
      ? Math.min(1, snapshot.loaded / snapshot.total)
      : undefined;
  const percent =
    progress != null ? Math.round(progress * 100) : null;

  return (
    <OverlayPortal>
      <div
        className="absolute inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-(--z-update-banner) flex justify-center px-4"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-md rounded-xl bg-swg-blue-dark px-4 py-3 font-text text-sm text-white shadow-lg">
          <p className="m-0 text-center">{phaseLabel(snapshot.phase)}</p>
          {percent != null ? (
            <div className="mt-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/25"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-swg-green-light transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="m-0 mt-1 text-center text-[0.75rem] opacity-85">
                {percent}%
                {snapshot.priorityReady ? " · spielbereit" : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </OverlayPortal>
  );
}
