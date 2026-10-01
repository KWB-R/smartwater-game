import { describe, expect, it } from "vitest";
import {
  BEFORE_AFTER_HANDLE_HIT_HALF_WIDTH_PX,
  clampBeforeAfterSliderPosition,
} from "@/components/features/gallery/BeforeAfterSlider";

describe("clampBeforeAfterSliderPosition", () => {
  it("keeps handle center inset by half hit width on a 400px container", () => {
    const width = 400;
    const inset = BEFORE_AFTER_HANDLE_HIT_HALF_WIDTH_PX / width;
    expect(clampBeforeAfterSliderPosition(0, width)).toBe(inset);
    expect(clampBeforeAfterSliderPosition(1, width)).toBe(1 - inset);
    expect(clampBeforeAfterSliderPosition(0.5, width)).toBe(0.5);
  });

  it("centers when container is narrower than handle", () => {
    expect(clampBeforeAfterSliderPosition(0, 32)).toBe(0.5);
    expect(clampBeforeAfterSliderPosition(1, 32)).toBe(0.5);
  });

  it("keeps handle inset while reveal can stay at 0", () => {
    const width = 400;
    const clip = { leftPx: 50, rightPx: 50 };
    const handleAtRevealZero = clampBeforeAfterSliderPosition(0, width, clip);
    expect(handleAtRevealZero).toBeGreaterThan(0);
    expect(clampBeforeAfterSliderPosition(1, width, clip)).toBeLessThan(1);
  });
});
