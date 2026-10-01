import { useRef } from "react";
import { CloseIcon } from "@/internal_assets/icons/CloseIcon";
import { AgencyLogo } from "@/components/layout/AgencyLogo";
import { useAppSettings } from "@/components/layout/appSettingsContext";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";
import { Button } from "@/components/ui/Button";
import { CornerRibbonButton } from "@/components/ui/CornerRibbonButton";

type LevelDiscardProgressScreenProps = {
  onStay: () => void;
  onDiscard: () => void;
};

export function LevelDiscardProgressScreen({
  onStay,
  onDiscard,
}: LevelDiscardProgressScreenProps) {
  const { settings } = useAppSettings();
  const legalLinks = settings.legalLinks;
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAssistiveHide(true, dialogRef);

  return (
    <div
      ref={dialogRef}
      className="pointer-events-auto fixed inset-0 z-(--z-menu-top) flex flex-col overflow-hidden bg-swg-blue-dark text-white pt-[calc(1rem+env(safe-area-inset-top,0px))] pr-[calc(1.25rem+env(safe-area-inset-right,0px))] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-[calc(1.25rem+env(safe-area-inset-left,0px))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-discard-title"
      aria-describedby="level-discard-description"
    >
      <header className="mb-5 shrink-0 pr-16">
        <AgencyLogo className="max-w-[12.5rem]" />
      </header>

      <CornerRibbonButton
        className="z-[1] shadow-[-5px_4px_10px_rgb(21_32_38/0.2)]"
        aria-label="Schließen"
        onClick={onStay}
      >
        <CloseIcon />
      </CornerRibbonButton>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1">
        <div className="w-full max-w-[min(100%,20.5rem)] rounded-2xl border-[3px] border-swg-blue-dark bg-white px-5 py-6 text-swg-black shadow-[0_10px_28px_rgb(55_81_114/0.22)]">
          <h2
            id="level-discard-title"
            className="m-0 text-center font-text text-2xl font-bold leading-tight"
          >
            Fortschritt verwerfen?
          </h2>
          <p
            id="level-discard-description"
            className="m-0 text-center font-text text-default leading-snug"
          >
            Wenn du fortfährst, wird dein aktueller Fortschritt nicht
            gespeichert.
          </p>
        </div>

        <div className="mt-5 flex w-full max-w-[min(100%,20.5rem)] gap-3">
          <Button grow shape="pill" variant="white" onClick={onStay}>
            zurück
          </Button>
          <Button grow shape="pill" variant="purple" onClick={onDiscard}>
            fortfahren
          </Button>
        </div>
      </div>

      <footer className="flex shrink-0 justify-between gap-3 border-t border-[rgb(127_190_235/0.35)] pt-3">
        {legalLinks.map((link) => (
          <a
            key={`${link.label}-${link.href}`}
            className="flex-1 text-center font-text text-[0.85rem] font-medium text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid"
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label}
          </a>
        ))}
      </footer>
    </div>
  );
}
