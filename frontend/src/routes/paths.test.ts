import { describe, expect, it } from "vitest";
import { rechtlichesPath, ROUTES } from "./paths";

describe("rechtlichesPath", () => {
  it("uses CMS slug as root path", () => {
    expect(rechtlichesPath("impressum")).toBe("/impressum");
    expect(rechtlichesPath("impressum")).toBe(ROUTES.rechtliches("impressum"));
  });

  it("returns null for blank slug", () => {
    expect(rechtlichesPath(null)).toBeNull();
    expect(rechtlichesPath("  ")).toBeNull();
  });

  it("returns null when slug collides with a reserved route", () => {
    expect(rechtlichesPath("karte")).toBeNull();
    expect(rechtlichesPath("level")).toBeNull();
    expect(rechtlichesPath("projektpartner")).toBeNull();
  });
});
