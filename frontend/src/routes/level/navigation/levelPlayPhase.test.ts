import { describe, expect, it } from "vitest";
import {
  LEVEL_PLAY_PHASE,
  parseLevelPlayPhaseParam,
  levelPlayPhaseToSegment,
} from "@/routes/level/navigation/levelPlayPhase";

describe("levelPlayPhase", () => {
  it("treats missing segment as placing", () => {
    expect(parseLevelPlayPhaseParam(undefined)).toBe(LEVEL_PLAY_PHASE.placing);
    expect(parseLevelPlayPhaseParam("")).toBe(LEVEL_PLAY_PHASE.placing);
  });

  it("falls back to placing for unknown segments", () => {
    expect(parseLevelPlayPhaseParam("unknown")).toBe(LEVEL_PLAY_PHASE.placing);
  });

  it("parses overlay phases", () => {
    expect(parseLevelPlayPhaseParam("failed")).toBe(LEVEL_PLAY_PHASE.failed);
    expect(parseLevelPlayPhaseParam("pre-quiz")).toBe(
      LEVEL_PLAY_PHASE.preQuiz,
    );
    expect(parseLevelPlayPhaseParam("share")).toBe(LEVEL_PLAY_PHASE.share);
  });

  it("omits URL segment for placing", () => {
    expect(levelPlayPhaseToSegment(LEVEL_PLAY_PHASE.placing)).toBeNull();
    expect(levelPlayPhaseToSegment(LEVEL_PLAY_PHASE.intro)).toBe("intro");
  });
});
