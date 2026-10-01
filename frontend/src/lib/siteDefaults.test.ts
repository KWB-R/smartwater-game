import { describe, expect, it } from "vitest";
import {
  DEFAULT_DOCUMENT_DESCRIPTION,
  resolveSeoDescription,
} from "./siteDefaults";

describe("resolveSeoDescription", () => {
  it("prefers meta_description", () => {
    expect(resolveSeoDescription("  SEO Text  ")).toBe("SEO Text");
  });

  it("falls back to default", () => {
    expect(resolveSeoDescription(null)).toBe(DEFAULT_DOCUMENT_DESCRIPTION);
  });
});
