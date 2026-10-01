import { describe, expect, it } from "vitest";
import { LEVEL_PLAY_PHASE } from "@/routes/level/navigation/levelPlayPhase";
import {
  canResolvePhaseHydration,
  levelPhaseHydrationKey,
  phaseBoardHydratedFrom,
  preQuizGateOpenFrom,
  resolveLevelUiPhase,
  resolvePhaseRestoreIntent,
  resolvePhaseUrlCorrection,
  shouldOpenPostPlacementGate,
  type LevelPhaseUrlCorrectionInput,
  type LevelUiPhaseInput,
  type PostPlacementGateInput,
} from "@/features/level/play/levelPhaseSyncPlan";

describe("resolvePhaseRestoreIntent", () => {
  it("mappt Phasen direkt auf Intents", () => {
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.quiz, false)).toBe(
      "quiz",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.share, false)).toBe(
      "share",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.preQuiz, false)).toBe(
      "preQuiz",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.failed, false)).toBe(
      "failed",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.placing, false)).toBe(
      null,
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.intro, false)).toBe(
      null,
    );
  });

  it("legacy winning-Phase landet im Pre-Quiz", () => {
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.winning, false)).toBe(
      "preQuiz",
    );
  });

  it("legacy postQuizWinning-State erzwingt Pre-Quiz, außer bei quiz/share", () => {
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.placing, true)).toBe(
      "preQuiz",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.failed, true)).toBe(
      "preQuiz",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.quiz, true)).toBe(
      "quiz",
    );
    expect(resolvePhaseRestoreIntent(LEVEL_PLAY_PHASE.share, true)).toBe(
      "share",
    );
  });
});

describe("canResolvePhaseHydration", () => {
  it("wartet, solange Session existiert, aber das Level noch keine Tiles hat", () => {
    expect(
      canResolvePhaseHydration({
        playAdvanced: false,
        levelTileCount: 0,
        hasSession: true,
      }),
    ).toBe(false);
  });

  it("entscheidet sofort, wenn keine Session existiert", () => {
    expect(
      canResolvePhaseHydration({
        playAdvanced: false,
        levelTileCount: 0,
        hasSession: false,
      }),
    ).toBe(true);
  });

  it("entscheidet, sobald Tiles geladen sind oder das Spiel schon lief", () => {
    expect(
      canResolvePhaseHydration({
        playAdvanced: false,
        levelTileCount: 5,
        hasSession: true,
      }),
    ).toBe(true);
    expect(
      canResolvePhaseHydration({
        playAdvanced: true,
        levelTileCount: 0,
        hasSession: true,
      }),
    ).toBe(true);
  });
});

describe("phaseBoardHydratedFrom", () => {
  it("liefert null, solange kein Restore-Ergebnis für die Phase vorliegt", () => {
    expect(phaseBoardHydratedFrom(null, "mitte-1", LEVEL_PLAY_PHASE.preQuiz)).toBe(
      null,
    );
    const otherPhase = {
      key: levelPhaseHydrationKey("mitte-1", LEVEL_PLAY_PHASE.failed),
      restored: true,
    };
    expect(
      phaseBoardHydratedFrom(otherPhase, "mitte-1", LEVEL_PLAY_PHASE.preQuiz),
    ).toBe(null);
    const otherLevel = {
      key: levelPhaseHydrationKey("spandau-1", LEVEL_PLAY_PHASE.preQuiz),
      restored: true,
    };
    expect(
      phaseBoardHydratedFrom(otherLevel, "mitte-1", LEVEL_PLAY_PHASE.preQuiz),
    ).toBe(null);
  });

  it("liefert das Restore-Ergebnis für die passende Phase", () => {
    const key = levelPhaseHydrationKey("mitte-1", LEVEL_PLAY_PHASE.preQuiz);
    expect(
      phaseBoardHydratedFrom(
        { key, restored: true },
        "mitte-1",
        LEVEL_PLAY_PHASE.preQuiz,
      ),
    ).toBe(true);
    expect(
      phaseBoardHydratedFrom(
        { key, restored: false },
        "mitte-1",
        LEVEL_PLAY_PHASE.preQuiz,
      ),
    ).toBe(false);
  });
});

function uiPhaseInput(
  overrides: Partial<LevelUiPhaseInput>,
): LevelUiPhaseInput {
  return {
    playPhase: LEVEL_PLAY_PHASE.placing,
    postQuizWinning: false,
    phaseBoardHydrated: null,
    quizUnderlayActive: false,
    shareComboFromUrl: false,
    ...overrides,
  };
}

describe("resolveLevelUiPhase", () => {
  it("placing ist der Default", () => {
    expect(resolveLevelUiPhase(uiPhaseInput({}))).toEqual({ kind: "placing" });
  });

  it("quiz kommt direkt aus der URL, Underlay als Flag", () => {
    expect(
      resolveLevelUiPhase(uiPhaseInput({ playPhase: LEVEL_PLAY_PHASE.quiz })),
    ).toEqual({ kind: "quiz", preQuizUnderlay: false });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.quiz,
          quizUnderlayActive: true,
        }),
      ),
    ).toEqual({ kind: "quiz", preQuizUnderlay: true });
  });

  it("share ist sofort aktiv; boardRestored erst mit Session oder Combo-Query", () => {
    expect(
      resolveLevelUiPhase(uiPhaseInput({ playPhase: LEVEL_PLAY_PHASE.share })),
    ).toEqual({ kind: "share", boardRestored: false });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.share,
          phaseBoardHydrated: true,
        }),
      ),
    ).toEqual({ kind: "share", boardRestored: true });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.share,
          shareComboFromUrl: true,
        }),
      ),
    ).toEqual({ kind: "share", boardRestored: true });
  });

  it("preQuiz/failed brauchen ein wiederhergestelltes Board", () => {
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.preQuiz,
          phaseBoardHydrated: true,
        }),
      ),
    ).toEqual({ kind: "preQuiz" });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({ playPhase: LEVEL_PLAY_PHASE.preQuiz }),
      ),
    ).toEqual({ kind: "placing" });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.failed,
          phaseBoardHydrated: true,
        }),
      ),
    ).toEqual({ kind: "failed" });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.failed,
          phaseBoardHydrated: false,
        }),
      ),
    ).toEqual({ kind: "placing" });
  });

  it("legacy winning/postQuizWinning landen im Pre-Quiz", () => {
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({
          playPhase: LEVEL_PLAY_PHASE.winning,
          phaseBoardHydrated: true,
        }),
      ),
    ).toEqual({ kind: "preQuiz" });
    expect(
      resolveLevelUiPhase(
        uiPhaseInput({ postQuizWinning: true, phaseBoardHydrated: true }),
      ),
    ).toEqual({ kind: "preQuiz" });
  });
});

describe("preQuizGateOpenFrom", () => {
  it("offen im Pre-Quiz und als Quiz-Underlay, sonst zu", () => {
    expect(preQuizGateOpenFrom({ kind: "preQuiz" })).toBe(true);
    expect(
      preQuizGateOpenFrom({ kind: "quiz", preQuizUnderlay: true }),
    ).toBe(true);
    expect(
      preQuizGateOpenFrom({ kind: "quiz", preQuizUnderlay: false }),
    ).toBe(false);
    expect(preQuizGateOpenFrom({ kind: "placing" })).toBe(false);
    expect(preQuizGateOpenFrom({ kind: "failed" })).toBe(false);
    expect(
      preQuizGateOpenFrom({ kind: "share", boardRestored: true }),
    ).toBe(false);
  });
});

function correctionInput(
  overrides: Partial<LevelPhaseUrlCorrectionInput>,
): LevelPhaseUrlCorrectionInput {
  return {
    quizScreenFromUrl: false,
    playPhase: LEVEL_PLAY_PHASE.placing,
    postQuizWinning: false,
    phaseBoardHydrated: null,
    shareScreenOpen: false,
    shareComboPartIds: [],
    locationSearch: "",
    ...overrides,
  };
}

describe("resolvePhaseUrlCorrection", () => {
  it("tut nichts, solange das Quiz die URL besitzt", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          quizScreenFromUrl: true,
          playPhase: LEVEL_PLAY_PHASE.quiz,
        }),
      ),
    ).toEqual({ kind: "none" });
  });

  it("normalisiert die legacy winning-URL zu pre-quiz", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({ playPhase: LEVEL_PLAY_PHASE.winning }),
      ),
    ).toEqual({
      kind: "navigate",
      phase: LEVEL_PLAY_PHASE.preQuiz,
      search: "",
    });
  });

  it("postQuizWinning-State navigiert erst nach erfolgreichem Restore zu pre-quiz", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({ postQuizWinning: true, phaseBoardHydrated: true }),
      ),
    ).toEqual({
      kind: "navigate",
      phase: LEVEL_PLAY_PHASE.preQuiz,
      search: "",
    });
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({ postQuizWinning: true, phaseBoardHydrated: null }),
      ),
    ).toEqual({ kind: "none" });
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({ postQuizWinning: true, phaseBoardHydrated: false }),
      ),
    ).toEqual({ kind: "none" });
  });

  it("failed ohne wiederherstellbare Session fällt auf placing zurück", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.failed,
          phaseBoardHydrated: false,
        }),
      ),
    ).toEqual({
      kind: "navigate",
      phase: LEVEL_PLAY_PHASE.placing,
      search: "",
    });
  });

  it("failed bleibt stehen, solange die Hydration aussteht oder gelungen ist", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.failed,
          phaseBoardHydrated: null,
        }),
      ),
    ).toEqual({ kind: "none" });
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.failed,
          phaseBoardHydrated: true,
        }),
      ),
    ).toEqual({ kind: "none" });
  });

  it("share-URL mit abweichender Combo-Query wird per replace korrigiert", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.share,
          shareScreenOpen: true,
          shareComboPartIds: ["eisdiele", "baum"],
          locationSearch: "?combo=baum",
        }),
      ),
    ).toEqual({
      kind: "navigate",
      phase: LEVEL_PLAY_PHASE.share,
      search: "combo=baum%2Beisdiele",
    });
  });

  it("share-URL mit passender Combo-Query: kein Navigieren", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.share,
          shareScreenOpen: true,
          shareComboPartIds: ["baum", "eisdiele"],
          locationSearch: "?combo=baum%2Beisdiele",
        }),
      ),
    ).toEqual({ kind: "none" });
  });

  it("share ohne geöffneten Share-Screen: keine Query-Korrektur", () => {
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.share,
          shareScreenOpen: false,
          shareComboPartIds: ["baum"],
        }),
      ),
    ).toEqual({ kind: "none" });
  });

  it("reguläre Phasen ohne Korrekturbedarf: kein Navigieren", () => {
    expect(resolvePhaseUrlCorrection(correctionInput({}))).toEqual({
      kind: "none",
    });
    expect(
      resolvePhaseUrlCorrection(
        correctionInput({
          playPhase: LEVEL_PLAY_PHASE.preQuiz,
          phaseBoardHydrated: true,
        }),
      ),
    ).toEqual({ kind: "none" });
  });
});

function gateInput(
  overrides: Partial<PostPlacementGateInput>,
): PostPlacementGateInput {
  return {
    armed: true,
    preQuizGateOpen: false,
    puzzleFailedOpen: false,
    shareScreenActive: false,
    placedCount: 3,
    currentMaxTileCount: 3,
    comboDialogOpen: false,
    ...overrides,
  };
}

describe("shouldOpenPostPlacementGate", () => {
  it("öffnet bei vollem Board ohne blockierende Overlays", () => {
    expect(shouldOpenPostPlacementGate(gateInput({}))).toBe(true);
  });

  it("nie ohne armed", () => {
    expect(shouldOpenPostPlacementGate(gateInput({ armed: false }))).toBe(
      false,
    );
  });

  it("nicht, wenn Gate/Failed/Share bereits aktiv", () => {
    expect(
      shouldOpenPostPlacementGate(gateInput({ preQuizGateOpen: true })),
    ).toBe(false);
    expect(
      shouldOpenPostPlacementGate(gateInput({ puzzleFailedOpen: true })),
    ).toBe(false);
    expect(
      shouldOpenPostPlacementGate(gateInput({ shareScreenActive: true })),
    ).toBe(false);
  });

  it("nicht bei unvollem Board", () => {
    expect(shouldOpenPostPlacementGate(gateInput({ placedCount: 2 }))).toBe(
      false,
    );
  });

  it("nicht, solange Kombi-Dialog aktiv", () => {
    expect(
      shouldOpenPostPlacementGate(gateInput({ comboDialogOpen: true })),
    ).toBe(false);
  });
});
