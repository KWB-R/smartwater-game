import { describe, expect, it } from "vitest";
import { svgGroupIdToBezirkId } from "./prepareBerlinMapSvg";

describe("svgGroupIdToBezirkId", () => {
  it("maps SVG group ids to CMS bezirkId keys", () => {
    expect(svgGroupIdToBezirkId("Tempelhof-Schoeneberg")).toBe(
      "tempelhof-schoneberg",
    );
    expect(svgGroupIdToBezirkId("Treptow-Koepenick")).toBe("treptow-kopenick");
    expect(svgGroupIdToBezirkId("Neukoelln")).toBe("neukolln");
    expect(svgGroupIdToBezirkId("gruenerRand")).toBeNull();
  });
});
