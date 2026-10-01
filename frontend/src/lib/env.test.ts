import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("local customer URL configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_STRAPI_BASE_URL", "");
    vi.stubEnv("VITE_STRAPI_URL", "");
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubEnv("VITE_COMBO_VIDEO_BASE_URL", "");
    vi.stubEnv("VITE_PWA_DEV", "false");
    vi.stubEnv("DEV", false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("allows an empty optional CMS and combo-video configuration", async () => {
    const env = await import("./env");
    expect(env.isStrapiConfigured()).toBe(false);
    expect(env.getStrapiOrigin()).toBeUndefined();
    expect(env.getComboVideoBaseUrl()).toBeUndefined();
  });

  it("uses the configured local API and accepts an empty video URL", async () => {
    vi.stubEnv("VITE_STRAPI_BASE_URL", "http://localhost:1337");
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:1337/api");
    const env = await import("./env");
    expect(env.getStrapiApiBase()).toBe("http://localhost:1337/api");
    expect(env.getComboVideoBaseUrl()).toBeUndefined();
  });

  it("uses the app origin for the PWA development proxy", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_PWA_DEV", "true");
    vi.stubGlobal("window", { location: { origin: "https://localhost:5173" } });
    const env = await import("./env");
    expect(env.getStrapiApiBase()).toBe("https://localhost:5173/api");
    expect(env.getStrapiOrigin()).toBe("https://localhost:5173");
  });
});
