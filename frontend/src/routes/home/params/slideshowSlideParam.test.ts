import { describe, expect, it } from "vitest";
import {
  parseSlideshowSlideParam,
  slideshowSlidePath,
} from "./slideshowSlideParam";

describe("slideshowSlideParam", () => {
  it("builds 1-based slideshow paths", () => {
    expect(slideshowSlidePath(0)).toBe("/slideshow/1");
    expect(slideshowSlidePath(2)).toBe("/slideshow/3");
  });

  it("parses 1-based slide numbers to zero-based index", () => {
    expect(parseSlideshowSlideParam("1", 4)).toBe(0);
    expect(parseSlideshowSlideParam("4", 4)).toBe(3);
  });

  it("falls back to first slide when missing or invalid", () => {
    expect(parseSlideshowSlideParam(undefined, 4)).toBe(0);
    expect(parseSlideshowSlideParam("", 4)).toBe(0);
    expect(parseSlideshowSlideParam("foo", 4)).toBe(0);
    expect(parseSlideshowSlideParam("0", 4)).toBe(0);
  });

  it("clamps past the last slide", () => {
    expect(parseSlideshowSlideParam("99", 3)).toBe(2);
  });
});
