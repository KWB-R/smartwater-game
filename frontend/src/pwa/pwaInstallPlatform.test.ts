import { describe, expect, it } from "vitest";
import {
  getPwaInstallInstructionVariant,
  isAndroidInstallBrowser,
  isIosInstallBrowser,
} from "./pwaInstallPlatform";

describe("isIosInstallBrowser", () => {
  it("detects iPhone user agents", () => {
    expect(
      isIosInstallBrowser({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it("detects iPadOS desktop UA", () => {
    expect(
      isIosInstallBrowser({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it("returns false for typical Android Chrome", () => {
    const android = {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    };
    expect(isIosInstallBrowser(android)).toBe(false);
    expect(isAndroidInstallBrowser(android)).toBe(true);
    expect(getPwaInstallInstructionVariant(android)).toBe("android");
  });

  it("returns desktop for typical desktop Chrome", () => {
    expect(
      getPwaInstallInstructionVariant({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        platform: "Win32",
        maxTouchPoints: 0,
      }),
    ).toBe("desktop");
  });
});
