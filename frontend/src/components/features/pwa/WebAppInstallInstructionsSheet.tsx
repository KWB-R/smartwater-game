import { AddIcon } from "@/internal_assets/icons/AddIcon";
import { ShareIcon } from "@/internal_assets/icons/ShareIcon";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import type { PwaInstallInstructionVariant } from "@/pwa/pwaInstallPlatform";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";

type WebAppInstallInstructionsSheetProps = {
  open: boolean;
  variant: PwaInstallInstructionVariant;
  onClose: () => void;
};

function AndroidMenuInstructionIcon() {
  return (
    <svg
      className="size-6 shrink-0 text-swg-green-light"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function AndroidInstallInstructionIcon() {
  return (
    <svg
      className="size-6 shrink-0 text-swg-green-light"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M7 4h10v3H7V4ZM5 8h14v12H5V8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 11v6M9 14h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WebAppInstallInstructionsSheet({
  open,
  variant,
  onClose,
}: WebAppInstallInstructionsSheetProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <OverlayPortal>
      <BottomSheet
        open={open}
        reducedMotion={reducedMotion}
        size="fitContent"
        rootClassName="z-[80]"
        panelClassName="rounded-[1.35rem] bg-white px-5 pt-7 pb-5 shadow-xl"
        backdropClassName="backdrop-blur-[2px]"
        bodyClassName="overflow-visible"
        fitContentBodyMaxHeight="none"
        labelledBy="webapp-install-instructions-title"
        onBackdropClick={onClose}
      >
        <h2 id="webapp-install-instructions-title" className="sr-only">
          WebApp installieren
        </h2>
        <ul className="m-0 flex list-none flex-col gap-5 p-0">
          {variant === "ios" ? (
            <>
              <li className="flex items-center gap-2">
                <ShareIcon className="size-6 shrink-0 text-swg-green-light" />
                <span className="text-[1rem] font-normal leading-tight text-swg-black">
                  Tippe auf das Teilen-Symbol
                </span>
              </li>
              <li className="flex items-center gap-2">
                <AddIcon className="size-6 shrink-0 text-swg-green-light" />
                <span className="text-[1rem] font-normal leading-tight text-swg-black">
                  Wähle „Zum Home-Bildschirm“
                </span>
              </li>
            </>
          ) : variant === "android" ? (
            <>
              <li className="flex items-center gap-2">
                <AndroidMenuInstructionIcon />
                <span className="text-[1rem] font-normal leading-tight text-swg-black">
                  Tippe auf das Menü (⋮) oben rechts
                </span>
              </li>
              <li className="flex items-center gap-2">
                <AndroidInstallInstructionIcon />
                <span className="text-[1rem] font-normal leading-tight text-swg-black">
                  Wähle „App installieren“ (nicht nur Verknüpfung). Falls nicht
                  sichtbar: „Zum Startbildschirm hinzufügen“
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-center gap-2">
                <AndroidInstallInstructionIcon />
                <span className="text-[1rem] font-normal leading-tight text-swg-black">
                  Klicke in der Adressleiste auf „App installieren“ (Symbol mit
                  Pfeil oder Plus)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <AndroidMenuInstructionIcon />
                <span className="text-[1rem] font-normal leading-tight text-swg-black">
                  Oder: Browsermenü (⋮) → „App installieren“ bzw. „Installieren“
                </span>
              </li>
            </>
          )}
        </ul>
        <p className="m-0 mt-6 text-center font-display text-[1.05rem] leading-snug text-swg-black/85">
          Danach erscheint die App wie eine normale App auf deinem
          Home-Bildschirm.
        </p>
        <Button block className="mt-6" onClick={onClose}>
          Alles klar!
        </Button>
      </BottomSheet>
    </OverlayPortal>
  );
}
