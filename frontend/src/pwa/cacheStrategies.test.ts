import { describe, expect, it } from "vitest";
import {
  isStrapiApiPathCachedByPwa,
  isStrapiUploadPath,
  PWA_SPA_NAVIGATION_DENYLIST,
} from "./cacheStrategies";

function navigationDeniedByPwa(pathname: string): boolean {
  return PWA_SPA_NAVIGATION_DENYLIST.some((re) => re.test(pathname));
}

describe("isStrapiApiPathCachedByPwa", () => {
  it("caches public content API paths", () => {
    expect(isStrapiApiPathCachedByPwa("/api/bezirks")).toBe(true);
    expect(isStrapiApiPathCachedByPwa("/api/homepage")).toBe(true);
  });

  it("excludes Strapi admin API", () => {
    expect(isStrapiApiPathCachedByPwa("/api/admin")).toBe(false);
    expect(isStrapiApiPathCachedByPwa("/api/admin/users")).toBe(false);
  });

  it("excludes upload media (incl. /api proxy prefix)", () => {
    expect(isStrapiApiPathCachedByPwa("/api/uploads/foo.jpg")).toBe(false);
    expect(isStrapiApiPathCachedByPwa("/api/uploads/x.svg")).toBe(false);
  });

  it("ignores non-API paths", () => {
    expect(isStrapiApiPathCachedByPwa("/uploads/foo.jpg")).toBe(false);
  });
});

describe("isStrapiUploadPath", () => {
  it("matches local and proxied upload paths", () => {
    expect(isStrapiUploadPath("/uploads/foo.jpg")).toBe(true);
    expect(isStrapiUploadPath("/api/uploads/foo.jpg")).toBe(true);
    expect(isStrapiUploadPath("/api/homepage")).toBe(false);
  });
});

describe("PWA_SPA_NAVIGATION_DENYLIST", () => {
  it("lets Strapi admin and API through to the network", () => {
    expect(navigationDeniedByPwa("/api/admin")).toBe(true);
    expect(navigationDeniedByPwa("/api/admin/users")).toBe(true);
    expect(navigationDeniedByPwa("/api/bezirks")).toBe(true);
    expect(navigationDeniedByPwa("/admin")).toBe(true);
    expect(navigationDeniedByPwa("/admin/auth/login")).toBe(true);
    expect(navigationDeniedByPwa("/uploads/foo.jpg")).toBe(true);
  });

  it("keeps SPA routes on the shell handler", () => {
    expect(navigationDeniedByPwa("/")).toBe(false);
    expect(navigationDeniedByPwa("/map")).toBe(false);
    expect(navigationDeniedByPwa("/level/1")).toBe(false);
  });
});
