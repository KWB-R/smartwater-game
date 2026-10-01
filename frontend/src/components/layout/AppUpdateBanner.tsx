import {
  applyPendingServiceWorkerUpdate,
} from "@/pwa/serviceWorkerRegistration";
import { OverlayPortal } from "@/components/ui/OverlayPortal";

type AppUpdateBannerProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function AppUpdateBanner({ visible, onDismiss }: AppUpdateBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <OverlayPortal>
      <div
        className="absolute inset-x-0 bottom-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-(--z-update-banner) flex justify-center px-4"
        role="status"
      >
        <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-3 rounded-xl bg-swg-blue-dark px-4 py-3 text-center font-text text-sm text-white shadow-lg">
          <span>Neue App-Version verfügbar.</span>
          <button
            type="button"
            className="cursor-pointer rounded-lg border-0 bg-swg-green-light px-3 py-1.5 font-text font-bold text-swg-blue-dark"
            onClick={() => {
              applyPendingServiceWorkerUpdate();
              onDismiss();
            }}
          >
            Aktualisieren
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
