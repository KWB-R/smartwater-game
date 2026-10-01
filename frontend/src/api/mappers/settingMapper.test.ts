import { describe, expect, it } from "vitest";
import { mapSettingResponse } from "./settingMapper";

describe("mapSettingResponse", () => {
  it("maps title and logo media", () => {
    const result = mapSettingResponse({
      title: "  Mein Spiel  ",
      logo: {
        id: 1,
        url: "/uploads/logo.svg",
        alternativeText: "Logo",
      },
    });

    expect(result.siteTitle).toBe("Mein Spiel");
    expect(result.metaDescription).toBeNull();
    expect(result.logoUrl).toContain("/uploads/logo.svg");
    expect(result.logoAlt).toBe("Logo");
    expect(result.logoInvertedUrl).toBeNull();
    expect(result.logoInvertedAlt).toBe("");
    expect(result.externalLinks).toEqual([]);
    expect(result.legalLinks).toEqual([]);
    expect(result.shareCta).toBeNull();
    expect(result.shareContent).toBeNull();
    expect(result.shareFallbackImageUrl).toBeNull();
    expect(result.landscapeScreen).toBeNull();
    expect(result.consent).toBeNull();
    expect(result.enabled).toBe(true);
  });

  it("maps meta_description", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      meta_description: "  Kurze Meta-Beschreibung.  ",
      logo: { id: 1, url: "/uploads/logo.svg" },
    });
    expect(result.metaDescription).toBe("Kurze Meta-Beschreibung.");
  });

  it("maps logo_inverted media", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg", alternativeText: "Logo" },
      logo_inverted: {
        id: 2,
        url: "/uploads/logo-inverted.svg",
        alternativeText: "Logo hell",
      },
    });

    expect(result.logoInvertedUrl).toContain("/uploads/logo-inverted.svg");
    expect(result.logoInvertedAlt).toBe("Logo hell");
  });

  it("maps enabled false as site disabled", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });

  it("treats enabled null as site enabled", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      enabled: null,
    });
    expect(result.enabled).toBe(true);
  });

  it("maps externallinks LinkComponents", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      externallinks: [
        { id: 1, title: " Mehr zur Schwammstadt ", link: " https://example.com/a " },
        { id: 2, title: "", link: "https://example.com/skip" },
        { id: 3, title: "Partner", link: "https://example.com/b" },
      ],
    });

    expect(result.externalLinks).toEqual([
      { label: "Mehr zur Schwammstadt", href: "https://example.com/a" },
      { label: "Partner", href: "https://example.com/b" },
    ]);
  });

  it("maps legalLinks LinkComponents", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      legalLinks: [
        {
          id: 1,
          title: " Impressum ",
          link: " https://example.com/impressum ",
        },
        { id: 2, title: "Datenschutz", link: "https://example.com/datenschutz" },
        { id: 3, title: "", link: "https://example.com/skip" },
      ],
    });

    expect(result.legalLinks).toEqual([
      { label: "Impressum", href: "https://example.com/impressum" },
      { label: "Datenschutz", href: "https://example.com/datenschutz" },
    ]);
  });

  it("maps shareComponent.shareCTA blocks", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      shareComponent: {
        id: 1,
        shareCTA: [
          {
            type: "heading",
            level: 2,
            children: [{ type: "text", text: "Yeah!" }],
          },
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Teile Deine Vision der Schwammstadt!",
              },
            ],
          },
        ],
      },
    });

    expect(result.shareCta).toEqual([
      {
        type: "heading",
        level: 2,
        children: [{ type: "text", text: "Yeah!" }],
      },
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Teile Deine Vision der Schwammstadt!" },
        ],
      },
    ]);
    expect(result.shareContent).toBeNull();
    expect(result.shareFallbackImageUrl).toBeNull();
  });

  it("maps shareComponent.shareContent and shareFallbackImage", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      shareComponent: {
        id: 1,
        shareContent: "  Berlin braucht mehr Schwammstadt-Power.  ",
        shareFallbackImage: {
          id: 9,
          url: "/uploads/share-fallback.webp",
          alternativeText: "Fallback",
        },
      },
    });

    expect(result.shareContent).toBe(
      "Berlin braucht mehr Schwammstadt-Power.",
    );
    expect(result.shareFallbackImageUrl).toContain(
      "/uploads/share-fallback.webp",
    );
  });

  it("maps landscapeScreenComponent content and image", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      landscapeScreenComponent: {
        id: 1,
        content: [
          {
            type: "heading",
            level: 2,
            children: [
              {
                type: "text",
                text: "Dreh dein Gerät zum Spielen bitte ins Hochformat.",
              },
            ],
          },
          {
            type: "paragraph",
            children: [{ type: "text", text: "Lieben Dank!" }],
          },
        ],
        image: {
          id: 3,
          url: "/uploads/landscape-mascot.webp",
          alternativeText: "Schwamm",
        },
      },
    });

    expect(result.landscapeScreen).toEqual({
      content: [
        {
          type: "heading",
          level: 2,
          children: [
            {
              type: "text",
              text: "Dreh dein Gerät zum Spielen bitte ins Hochformat.",
            },
          ],
        },
        {
          type: "paragraph",
          children: [{ type: "text", text: "Lieben Dank!" }],
        },
      ],
      imageUrl: expect.stringContaining("/uploads/landscape-mascot.webp"),
      imageAlt: "Schwamm",
    });
  });

  it("returns null landscapeScreen when component empty", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      landscapeScreenComponent: { id: 1, content: null, image: null },
    });
    expect(result.landscapeScreen).toBeNull();
  });

  it("maps consent component content and buttons", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      consent: {
        id: 1,
        acceptButton: "  Statistik erlauben  ",
        denyButton: "  Nein, danke  ",
        content: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Wir erfassen anonyme Nutzungsstatistiken.",
              },
            ],
          },
        ],
      },
    });

    expect(result.consent).toEqual({
      acceptButton: "Statistik erlauben",
      denyButton: "Nein, danke",
      content: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              text: "Wir erfassen anonyme Nutzungsstatistiken.",
            },
          ],
        },
      ],
    });
  });

  it("returns null consent when content missing", () => {
    const result = mapSettingResponse({
      title: "Spiel",
      logo: { id: 1, url: "/uploads/logo.svg" },
      consent: {
        id: 1,
        acceptButton: "Ok",
        denyButton: "Nein",
        content: null,
      },
    });
    expect(result.consent).toBeNull();
  });

  it("returns empty values when data is null", () => {
    expect(mapSettingResponse(null)).toEqual({
      siteTitle: null,
      metaDescription: null,
      logoUrl: null,
      logoAlt: "",
      logoInvertedUrl: null,
      logoInvertedAlt: "",
      externalLinks: [],
      legalLinks: [],
      shareCta: null,
      shareContent: null,
      shareFallbackImageUrl: null,
      landscapeScreen: null,
      consent: null,
      enabled: true,
    });
  });
});
