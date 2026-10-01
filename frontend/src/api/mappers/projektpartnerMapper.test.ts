import { describe, expect, it } from "vitest";
import { mapProjektpartnerResponse } from "@/api/mappers/projektpartnerMapper";

describe("mapProjektpartnerResponse", () => {
  it("maps collaborators imagelink components", () => {
    const result = mapProjektpartnerResponse({
      collaborateContent: [
        {
          type: "heading",
          level: 2,
          children: [{ type: "text", text: "Umgesetzt von" }],
        },
      ],
      collaborators: [
        {
          id: 1,
          title: "KWB",
          link: "https://example.com/kwb",
          image: {
            id: 10,
            url: "/uploads/kwb.png",
            alternativeText: "KWB Logo",
          },
        },
        {
          id: 2,
          title: "Ohne Link",
          link: "",
          image: {
            id: 11,
            url: "/uploads/ohne.png",
            alternativeText: null,
          },
        },
      ],
      fundeByTitle: "Gefördert im Rahmen von",
      fundedByMedia: [
        {
          id: 3,
          title: "Förderer",
          link: "https://example.com/foerderer",
          image: {
            id: 12,
            url: "/uploads/foerderer.png",
            alternativeText: "Förderer Logo",
          },
        },
      ],
      fundedByContent: [
        {
          type: "paragraph",
          children: [{ type: "text", text: "Fördertext" }],
        },
      ],
    });

    expect(result.collaborateContent).toHaveLength(1);
    expect(result.fundedByTitle).toBe("Gefördert im Rahmen von");
    expect(result.fundedByContent).toHaveLength(1);
    expect(result.collaborators).toEqual([
      {
        id: "1",
        title: "KWB",
        href: "https://example.com/kwb",
        imageUrl: expect.stringContaining("/uploads/kwb.png"),
        imageAlt: "KWB Logo",
      },
      {
        id: "2",
        title: "Ohne Link",
        href: null,
        imageUrl: expect.stringContaining("/uploads/ohne.png"),
        imageAlt: "Ohne Link",
      },
    ]);
    expect(result.fundedByMedia).toEqual([
      {
        id: "3",
        title: "Förderer",
        href: "https://example.com/foerderer",
        imageUrl: expect.stringContaining("/uploads/foerderer.png"),
        imageAlt: "Förderer Logo",
      },
    ]);
  });

  it("returns empty content for null payload", () => {
    expect(mapProjektpartnerResponse(null)).toEqual({
      collaborateContent: null,
      collaborators: [],
      fundedByTitle: null,
      fundedByMedia: [],
      fundedByContent: null,
    });
  });
});
