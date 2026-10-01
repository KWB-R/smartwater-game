import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasAnalyticsConsent,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./analyticsConsent";

const STORAGE_KEY = "swg:analytics:consent";

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createStorage());
});

afterEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  vi.unstubAllGlobals();
});

describe("analyticsConsent", () => {
  it("starts without decision", () => {
    expect(readAnalyticsConsent()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("persists accept", () => {
    writeAnalyticsConsent("accepted");
    expect(readAnalyticsConsent()).toBe("accepted");
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("persists deny", () => {
    writeAnalyticsConsent("denied");
    expect(readAnalyticsConsent()).toBe("denied");
    expect(hasAnalyticsConsent()).toBe(false);
  });
});
