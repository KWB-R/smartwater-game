import { describe, expect, it } from "vitest";
import { ROUTES } from "@/routes/paths";
import { outletTransitionKey } from "./outletTransitionKey";

describe("outletTransitionKey", () => {
  it("keeps map district routes on the map key", () => {
    expect(outletTransitionKey(ROUTES.map)).toBe(ROUTES.map);
    expect(outletTransitionKey(ROUTES.mapDistrictDetail("abc"))).toBe(ROUTES.map);
    expect(outletTransitionKey(ROUTES.mapDistrictLevelDetail("abc", "lvl-1"))).toBe(
      ROUTES.map,
    );
  });

  it("keeps level sub-routes on the same level key", () => {
    const levelId = "doc-1";
    expect(outletTransitionKey(ROUTES.levelIntro(levelId))).toBe(
      `${ROUTES.level}/${levelId}`,
    );
    expect(outletTransitionKey(ROUTES.levelPlay(levelId))).toBe(
      `${ROUTES.level}/${levelId}`,
    );
  });

  it("keeps gallerie on the map outlet key (sheet over map)", () => {
    expect(outletTransitionKey(ROUTES.gallerie)).toBe(ROUTES.map);
    expect(outletTransitionKey(ROUTES.gallerieLevel("lvl-1"))).toBe(ROUTES.map);
  });

  it("uses full pathname for other routes", () => {
    expect(outletTransitionKey(ROUTES.debugLichtenbergLayout)).toBe(
      ROUTES.debugLichtenbergLayout,
    );
  });

  it("groups home landing and slideshow under one outlet key", () => {
    expect(outletTransitionKey("/")).toBe("home-intro");
    expect(outletTransitionKey(ROUTES.slideshow)).toBe("home-intro");
    expect(outletTransitionKey(ROUTES.slideshowSlide(2))).toBe("home-intro");
  });
});
