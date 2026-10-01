import { describe, expect, it } from "vitest";
import {
  BEFORE_AFTER_INTRO_HOLD_MS_DEFAULT,
} from "@/components/features/level/play/preQuizBeforeAfterIntroTiming";

describe("preQuizBeforeAfterIntroTiming", () => {
  it("behält die Pause von 1400 ms für Galerie und Quizvorbereitung bei", () => {
    expect(BEFORE_AFTER_INTRO_HOLD_MS_DEFAULT).toBe(1_400);
  });

});
