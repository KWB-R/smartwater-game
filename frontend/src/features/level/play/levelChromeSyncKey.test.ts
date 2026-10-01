import { describe, expect, it } from "vitest";
import {
  buildPlayLevelChromeSyncKey,
  buildPreloadLevelChromeSyncKey,
} from "@/features/level/play/levelChromeSyncKey";

describe("levelChromeSyncKey", () => {
  it("builds preload keys with stable field order", () => {
    expect(
      buildPreloadLevelChromeSyncKey({
        levelKey: "level-1",
        districtName: "Mitte",
        missionLabel: "Mission A",
        librarySkeletonSlotCount: 4,
        missionDismissOverlayActive: true,
        missionDismissSheetOpen: false,
      }),
    ).toBe("preload|level-1|Mitte|Mission A|4|1|0");
  });

  it("builds play keys with stable field order", () => {
    expect(
      buildPlayLevelChromeSyncKey({
        quizScreenFromUrl: true,
        levelKey: "level-1",
        districtName: "Mitte",
        missionLabel: "Mission A",
        headerBarScore: 12,
        barScoreGainLabel: null,
        barMaxScore: 30,
        placedTilesLength: 3,
        maximumTileCount: 6,
        missionDialogOpen: true,
        preQuizGateOpen: false,
        postPlacementConfettiActive: false,
        puzzleFailedOpen: true,
        shareScreenActive: true,
        showWinningMaxCelebration: false,
        reducedMotion: false,
        draggingTileId: 9,
        detailTileId: 4,
        comboDialogOpen: true,
        placementRewardBlocking: false,
        currentMaxTileCount: 5,
        missionDismissOverlayActive: true,
        missionDismissSheetOpen: false,
        availableTilesCount: 2,
        levelTilesLength: 7,
        levelPlayTutorialChromeKey: "",
        libraryIntroSettled: false,
      }),
    ).toBe("play|quiz|level-1|Mitte|Mission A|12||30|3|6|1|0|0|1|1|0|0|9|4|1|0|5|1|0|2|7||0");
  });

  it("normalizes empty optional ids", () => {
    expect(
      buildPlayLevelChromeSyncKey({
        quizScreenFromUrl: false,
        levelKey: "level-1",
        districtName: "Mitte",
        missionLabel: "Mission A",
        headerBarScore: 0,
        barScoreGainLabel: null,
        barMaxScore: 1,
        placedTilesLength: 0,
        maximumTileCount: 1,
        missionDialogOpen: false,
        preQuizGateOpen: false,
        postPlacementConfettiActive: false,
        puzzleFailedOpen: false,
        shareScreenActive: false,
        showWinningMaxCelebration: false,
        reducedMotion: false,
        draggingTileId: null,
        detailTileId: undefined,
        comboDialogOpen: false,
        placementRewardBlocking: false,
        currentMaxTileCount: 1,
        missionDismissOverlayActive: false,
        missionDismissSheetOpen: false,
        availableTilesCount: 0,
        levelTilesLength: 0,
        levelPlayTutorialChromeKey: "",
        libraryIntroSettled: false,
      }),
    ).toBe("play||level-1|Mitte|Mission A|0||1|0|1|0|0|0|0|0|0|0|||0|0|1|0|0|0|0||0");
  });
});
