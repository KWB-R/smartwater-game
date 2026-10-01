import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveStrapiBlockImage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_PWA_DEV", "false");
    vi.stubEnv("VITE_STRAPI_BASE_URL", "http://localhost:1552");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("löst Blockbilder ohne numerische ID auf", async () => {
    const { resolveStrapiBlockImage } = await import("@/api/strapiBlockImage");

    const result = resolveStrapiBlockImage({
      url: "/uploads/sponge.png",
      alternativeText: "Schwamm",
      documentId: "abc123",
    });

    expect(result).toEqual({
      src: "http://localhost:1552/uploads/sponge.png",
      alt: "Schwamm",
    });
  });

  it("löst Bilder aus einer Strapi-Beziehung auf", async () => {
    const { resolveStrapiBlockImage } = await import("@/api/strapiBlockImage");

    const result = resolveStrapiBlockImage({
      data: {
        url: "/uploads/hero.jpg",
        alternativeText: null,
      },
    });

    expect(result?.src).toBe("http://localhost:1552/uploads/hero.jpg");
    expect(result?.alt).toBe("");
  });
});
