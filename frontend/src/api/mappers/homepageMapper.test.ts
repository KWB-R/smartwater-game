import { describe, expect, it } from "vitest";
import { mapHomepageResponse } from "@/api/mappers/homepageMapper";

const paragraphBlock = {
  type: "paragraph",
  children: [{ type: "text", text: "Willkommen" }],
};

describe("mapHomepageResponse", () => {
  it("maps slideshow image and video slides", () => {
    const homepage = mapHomepageResponse({
      content: [paragraphBlock],
      slideshow: [
        {
          id: 1,
          content: [paragraphBlock],
          image: {
            id: 10,
            url: "https://cms.example/uploads/hero.jpg",
            mime: "image/jpeg",
            alternativeText: "Hero",
          },
        },
        {
          id: 2,
          content: [paragraphBlock],
          image: {
            id: 11,
            url: "https://cms.example/uploads/reel.mp4",
            mime: "video/mp4",
            alternativeText: null,
            formats: {
              thumbnail: { url: "https://cms.example/uploads/reel_thumb.jpg" },
            },
          },
        },
      ],
    });

    expect(homepage.content?.[0]).toMatchObject({ type: "paragraph" });
    expect(homepage.slides).toHaveLength(2);
    expect(homepage.slides[0]).toMatchObject({
      id: "1",
      mediaUrl: "https://cms.example/uploads/hero.jpg",
      mediaKind: "image",
      posterUrl: null,
      alt: "Hero",
    });
    expect(homepage.slides[1]).toMatchObject({
      id: "2",
      mediaUrl: "https://cms.example/uploads/reel.mp4",
      mediaKind: "video",
      posterUrl: "https://cms.example/uploads/reel_thumb.jpg",
      alt: "",
    });
  });

  it("supports relation-wrapped media and skips slides without media", () => {
    const homepage = mapHomepageResponse({
      slideshow: [
        {
          id: 1,
          image: null,
        },
        {
          documentId: "slide-video",
          image: {
            data: {
              id: 12,
              attributes: {
                url: "https://cms.example/uploads/intro.mov",
                alternativeText: "Intro",
              },
            },
          },
        },
      ],
    });

    expect(homepage.slides).toHaveLength(1);
    expect(homepage.slides[0]).toMatchObject({
      id: "slide-video",
      mediaKind: "video",
      alt: "Intro",
    });
  });
});
