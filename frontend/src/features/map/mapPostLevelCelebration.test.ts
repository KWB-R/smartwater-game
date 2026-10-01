import { describe, expect, it } from "vitest";
import { ROUTES } from "@/routes/paths";
import {
  createMapReturnFromShareLocationState,
  isMapPostLevelDetailFlowActive,
  readMapPostLevelCelebration,
} from "@/features/map/mapPostLevelCelebration";

describe("mapPostLevelCelebration", () => {
  it("reads celebration payload from location state", () => {
    const state = createMapReturnFromShareLocationState({
      levelStartKey: "lvl-a",
      districtRouteId: "bez-1",
      starCount: 2,
      bonusAfterDismiss: true,
    });
    expect(readMapPostLevelCelebration(state)).toEqual({
      starCount: 2,
      fromStarCount: 0,
      bonusAfterDismiss: true,
      mapDistrictWasUnhighlighted: false,
      mapDistrictNewlyFullySolved: false,
      mapRevealBonus: true,
      mapMarkerWasLevelMaxBeforeRun: false,
    });
  });

  it("reads fromStarCount when provided", () => {
    const state = createMapReturnFromShareLocationState({
      levelStartKey: "lvl-a",
      districtRouteId: "bez-1",
      starCount: 3,
      fromStarCount: 1,
      bonusAfterDismiss: false,
    });
    expect(readMapPostLevelCelebration(state)).toEqual({
      starCount: 3,
      fromStarCount: 1,
      bonusAfterDismiss: false,
      mapDistrictWasUnhighlighted: false,
      mapDistrictNewlyFullySolved: false,
      mapRevealBonus: false,
      mapMarkerWasLevelMaxBeforeRun: false,
    });
  });

  it("returns null when celebration flag missing", () => {
    expect(readMapPostLevelCelebration({ levelStartKey: "x" })).toBeNull();
  });

  it("detects active detail flow for post-level return", () => {
    const state = createMapReturnFromShareLocationState({
      levelStartKey: "lvl-a",
      districtRouteId: "bez-1",
      starCount: 2,
      bonusAfterDismiss: true,
    });
    expect(
      isMapPostLevelDetailFlowActive({
        pathname: ROUTES.map,
        state,
        districtRouteId: "bez-1",
      }),
    ).toBe(true);
    expect(
      isMapPostLevelDetailFlowActive({
        pathname: ROUTES.mapDistrictLevelDetail("bez-1", "lvl-a"),
        state,
        districtRouteId: "bez-1",
      }),
    ).toBe(true);
    expect(
      isMapPostLevelDetailFlowActive({
        pathname: ROUTES.map,
        state: null,
      }),
    ).toBe(false);
    const afterDetailClose = createMapReturnFromShareLocationState({
      levelStartKey: "lvl-a",
      districtRouteId: "bez-1",
      starCount: 2,
      bonusAfterDismiss: true,
      detailPending: false,
    });
    expect(
      isMapPostLevelDetailFlowActive({
        pathname: ROUTES.map,
        state: afterDetailClose,
        districtRouteId: "bez-1",
      }),
    ).toBe(false);
  });
});
