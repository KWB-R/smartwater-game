/**
 * Bildet einen stabilen Schlüssel aus allen für das Tutorial relevanten Werten.
 * Eine Änderung aktualisiert die Tutorialelemente der Spieloberfläche.
 */
export type LevelPlayTutorialChromeKeyInput = {
  active: boolean;
  stepIndex: number;
  stepId: string | undefined;
  requiresTileCardsMenuClick: boolean;
  blocksBoardPointer: boolean;
  blocksLibraryDrag: boolean;
  tileCardsMenuDisabled: boolean;
};

export function buildLevelPlayTutorialChromeKey(
  input: LevelPlayTutorialChromeKeyInput,
): string {
  return [
    input.active ? "1" : "0",
    input.active ? String(input.stepIndex) : "",
    input.stepId ?? "",
    input.requiresTileCardsMenuClick ? "1" : "0",
    input.blocksBoardPointer ? "1" : "0",
    input.blocksLibraryDrag ? "1" : "0",
    input.tileCardsMenuDisabled ? "1" : "0",
  ].join(":");
}
