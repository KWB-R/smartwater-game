import { describe, expect, it } from "vitest";
import { mapRechtlichesResponse } from "@/api/mappers/rechtlichesMapper";

describe("mapRechtlichesResponse", () => {
  it("maps title, slug and content blocks", () => {
    const result = mapRechtlichesResponse({
      title: "  Rechtliches  ",
      slug: " impressum ",
      content: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Impressum und Datenschutz" }],
        },
      ],
    });

    expect(result.title).toBe("Rechtliches");
    expect(result.slug).toBe("impressum");
    expect(result.content).toHaveLength(1);
  });

  it("returns empty content for null payload", () => {
    expect(mapRechtlichesResponse(null)).toEqual({
      title: null,
      slug: null,
      content: null,
    });
  });

  it("treats blank title as missing", () => {
    expect(mapRechtlichesResponse({ title: "   ", content: null }).title).toBe(
      null,
    );
  });
});
