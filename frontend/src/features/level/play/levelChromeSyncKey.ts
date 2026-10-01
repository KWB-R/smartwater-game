type PreloadLevelChromeSyncKeyArgs = {
  levelKey: string;
  districtName: string;
  missionLabel: string;
  librarySkeletonSlotCount: number;
  missionDismissOverlayActive: boolean;
  missionDismissSheetOpen: boolean;
};

type PlayLevelChromeSyncKeyArgs = {
  quizScreenFromUrl: boolean;
  levelKey: string;
  districtName: string;
  missionLabel: string;
  headerBarScore: number;
  barScoreGainLabel: string | null;
  barMaxScore: number;
  placedTilesLength: number;
  maximumTileCount: number;
  missionDialogOpen: boolean;
  preQuizGateOpen: boolean;
  /** Ein geänderter Konfettizustand muss den Schlüssel erneuern, damit der Hintergrund aktualisiert wird. */
  postPlacementConfettiActive: boolean;
  puzzleFailedOpen: boolean;
  shareScreenActive: boolean;
  showWinningMaxCelebration: boolean;
  reducedMotion: boolean;
  draggingTileId: number | null;
  detailTileId: number | null | undefined;
  comboDialogOpen: boolean;
  placementRewardBlocking: boolean;
  currentMaxTileCount: number;
  missionDismissOverlayActive: boolean;
  missionDismissSheetOpen: boolean;
  availableTilesCount: number;
  levelTilesLength: number;
  levelPlayTutorialChromeKey: string;
  libraryIntroSettled: boolean;
};

function flag(value: boolean): "0" | "1" {
  return value ? "1" : "0";
}

export function buildPreloadLevelChromeSyncKey({
  levelKey,
  districtName,
  missionLabel,
  librarySkeletonSlotCount,
  missionDismissOverlayActive,
  missionDismissSheetOpen,
}: PreloadLevelChromeSyncKeyArgs): string {
  return [
    "preload",
    levelKey,
    districtName,
    missionLabel,
    String(librarySkeletonSlotCount),
    flag(missionDismissOverlayActive),
    flag(missionDismissSheetOpen),
  ].join("|");
}

export function buildPlayLevelChromeSyncKey({
  quizScreenFromUrl,
  levelKey,
  districtName,
  missionLabel,
  headerBarScore,
  barScoreGainLabel,
  barMaxScore,
  placedTilesLength,
  maximumTileCount,
  missionDialogOpen,
  preQuizGateOpen,
  postPlacementConfettiActive,
  puzzleFailedOpen,
  shareScreenActive,
  showWinningMaxCelebration,
  reducedMotion,
  draggingTileId,
  detailTileId,
  comboDialogOpen,
  placementRewardBlocking,
  currentMaxTileCount,
  missionDismissOverlayActive,
  missionDismissSheetOpen,
  availableTilesCount,
  levelTilesLength,
  levelPlayTutorialChromeKey,
  libraryIntroSettled,
}: PlayLevelChromeSyncKeyArgs): string {
  return [
    "play",
    quizScreenFromUrl ? "quiz" : "",
    levelKey,
    districtName,
    missionLabel,
    String(headerBarScore),
    barScoreGainLabel ?? "",
    String(barMaxScore),
    String(placedTilesLength),
    String(maximumTileCount),
    flag(missionDialogOpen),
    flag(preQuizGateOpen),
    flag(postPlacementConfettiActive),
    flag(puzzleFailedOpen),
    flag(shareScreenActive),
    flag(showWinningMaxCelebration),
    flag(reducedMotion),
    String(draggingTileId ?? ""),
    String(detailTileId ?? ""),
    flag(comboDialogOpen),
    flag(placementRewardBlocking),
    String(currentMaxTileCount),
    flag(missionDismissOverlayActive),
    flag(missionDismissSheetOpen),
    String(availableTilesCount),
    String(levelTilesLength),
    levelPlayTutorialChromeKey,
    flag(libraryIntroSettled),
  ].join("|");
}
