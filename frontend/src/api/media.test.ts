import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isStrapiUploadPath } from "@/pwa/cacheStrategies";

describe("resolveStrapiMediaUrl", () => {
  beforeEach(() => {
    // env.ts speichert die Konfiguration beim ersten Zugriff pro Modulinstanz.
    vi.resetModules();
    vi.stubEnv("VITE_STRAPI_BASE_URL", "https://cms.example");
    vi.stubEnv("VITE_PWA_DEV", "false");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("leitet CMS-Uploads in der Entwicklung über den App-Proxy", async () => {
    vi.stubEnv("DEV", true);
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    });

    const { resolveStrapiMediaUrl } = await import("@/api/media");
    const rewritten = resolveStrapiMediaUrl(
      "http://localhost:1552/uploads/hero.jpg",
    );

    expect(rewritten).toBe("http://localhost:5173/uploads/hero.jpg");
  });

  it("behält absolute URLs außerhalb von /uploads bei", async () => {
    vi.stubEnv("DEV", true);
    vi.stubGlobal("window", {
      location: { origin: "http://localhost:5173" },
    });

    const { resolveStrapiMediaUrl } = await import("@/api/media");
    const url = "https://example.com/other.png";
    expect(resolveStrapiMediaUrl(url)).toBe(url);
  });

  it("behält einen /api-Pfad in der konfigurierten Medienbasis bei", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_STRAPI_BASE_URL", "https://cms.example.com/api");

    const { resolveStrapiMediaUrl } = await import("@/api/media");
    const src = resolveStrapiMediaUrl("/uploads/schwammtastisch.svg");
    expect(src).toBe(
      "https://cms.example.com/api/uploads/schwammtastisch.svg",
    );
    expect(isStrapiUploadPath(new URL(src).pathname)).toBe(true);
  });

  it("verwendet im PWA-Entwicklungsmodus die Origin der App", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_PWA_DEV", "true");
    vi.stubGlobal("window", {
      location: { origin: "https://localhost:5173" },
    });
    const { resolveStrapiMediaUrl } = await import("@/api/media");
    expect(resolveStrapiMediaUrl("/uploads/hero.jpg?width=100")).toBe(
      "https://localhost:5173/uploads/hero.jpg?width=100",
    );
  });
});
