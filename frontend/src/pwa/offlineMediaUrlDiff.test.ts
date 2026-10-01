import { describe, expect, it } from "vitest";

import { diffOfflineMediaUrls } from "@/pwa/offlineMediaUrlDiff";

describe("diffOfflineMediaUrls", () => {
  it("detects added, removed, and overlap", () => {
    const prev = [
      "https://cdn.example/a.webp",
      "https://cdn.example/b.webp",
    ];
    const next = [
      "https://cdn.example/b.webp",
      "https://cdn.example/c.webp",
    ];
    const diff = diffOfflineMediaUrls(prev, next);
    expect(diff.added).toEqual(["https://cdn.example/c.webp"]);
    expect(diff.removed).toEqual(["https://cdn.example/a.webp"]);
    expect(diff.overlap).toEqual(["https://cdn.example/b.webp"]);
  });

  it("normalizes relative URLs against window origin when available", () => {
    const diff = diffOfflineMediaUrls(
      ["/uploads/old.png"],
      ["/uploads/old.png", "/uploads/new.png"],
    );
    expect(diff.removed).toEqual([]);
    expect(diff.overlap.length).toBe(1);
    expect(diff.added.length).toBe(1);
    expect(diff.added[0]).toContain("/uploads/new.png");
  });
});
