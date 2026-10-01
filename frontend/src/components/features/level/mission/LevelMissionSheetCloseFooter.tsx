import { Button } from "@/components/ui/Button";

type LevelMissionSheetCloseFooterProps = {
  onClose: () => void;
};

export function LevelMissionSheetCloseFooter({
  onClose,
}: LevelMissionSheetCloseFooterProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-[0.85rem]">
      <Button grow onClick={onClose}>
        Schließen
      </Button>
    </div>
  );
}
