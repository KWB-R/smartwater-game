import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearShareFileCache,
  fetchShareImageFile,
  peekShareImageFile,
  primeShareImageFile,
  resolveShareClipboardText,
  resolveShareImageFile,
  resolveShareVideoFile,
  shareLevelNative,
  shareLevelViaPlatform,
} from "./shareLevelVideo";

function mockImageResponse(
  bytes = new Uint8Array([1, 2, 3]),
  type = "image/webp",
) {
  return {
    ok: true,
    blob: async () => new Blob([bytes], { type }),
  } as Response;
}

describe("fetchShareImageFile", () => {
  afterEach(() => {
    clearShareFileCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns File for successful image fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockImageResponse()));

    const file = await fetchShareImageFile(
      "https://cdn.example/combo__a.webp",
    );

    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe("combo__a.webp");
    expect(file?.type).toBe("image/webp");
  });

  it("returns null on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, blob: async () => new Blob() }),
    );

    await expect(
      fetchShareImageFile("https://cdn.example/missing.webp"),
    ).resolves.toBeNull();
  });
});

describe("resolveShareImageFile", () => {
  afterEach(() => {
    clearShareFileCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses primary image when fetch succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockImageResponse(new Uint8Array([9])));
    vi.stubGlobal("fetch", fetchMock);

    const file = await resolveShareImageFile(
      "https://cdn.example/finished.webp",
      "https://cdn.example/fallback.webp",
    );

    expect(file?.name).toBe("finished.webp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cdn.example/finished.webp",
    );
  });

  it("falls back when primary fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, blob: async () => new Blob() })
      .mockResolvedValueOnce(mockImageResponse());
    vi.stubGlobal("fetch", fetchMock);

    const file = await resolveShareImageFile(
      "https://cdn.example/finished.webp",
      "https://cdn.example/fallback.webp",
    );

    expect(file?.name).toBe("fallback.webp");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uses fallback when primary url missing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockImageResponse());
    vi.stubGlobal("fetch", fetchMock);

    const file = await resolveShareImageFile(
      null,
      "https://cdn.example/fallback.webp",
    );

    expect(file?.name).toBe("fallback.webp");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when both fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, blob: async () => new Blob() }),
    );

    await expect(
      resolveShareImageFile(
        "https://cdn.example/a.webp",
        "https://cdn.example/b.webp",
      ),
    ).resolves.toBeNull();
  });
});

describe("shareLevelNative", () => {
  beforeEach(() => {
    clearShareFileCache();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockImageResponse()));
  });

  afterEach(() => {
    clearShareFileCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shares immediately without awaiting image fetch (user gesture)", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(fetchPromise));

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/level",
        origin: "https://app.example",
      },
    });

    const shareDone = shareLevelNative({
      pageUrl: "https://app.example/share",
      text: "Berlin braucht mehr Schwammstadt-Power.",
      imageUrl: "https://cdn.example/finished.webp",
    });

    // Die native Freigabe vor Ende des Abrufs öffnen, solange die direkte Nutzeraktion gültig ist.
    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.text).toBe("Berlin braucht mehr Schwammstadt-Power.");
    expect(payload.url).toBe("https://app.example/share");
    expect(payload.files).toBeUndefined();

    resolveFetch(mockImageResponse());
    await shareDone;
  });

  it("includes primed image file on share without url (mobile-safe)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockImageResponse()));
    primeShareImageFile("https://cdn.example/finished.webp", null);
    await resolveShareImageFile("https://cdn.example/finished.webp", null);
    expect(
      peekShareImageFile("https://cdn.example/finished.webp", null),
    ).toBeInstanceOf(File);

    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn((data: ShareData) => Boolean(data.files?.length));
    vi.stubGlobal("navigator", {
      share,
      canShare,
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/level",
        origin: "https://app.example",
      },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      text: "Berlin braucht mehr Schwammstadt-Power.",
      imageUrl: "https://cdn.example/finished.webp",
    });

    expect(share).toHaveBeenCalledTimes(1);
    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.files).toHaveLength(1);
    expect(payload.url).toBeUndefined();
    expect(payload.text).toBe("Berlin braucht mehr Schwammstadt-Power.");
  });

  it("prefers primed share video over image", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url.endsWith(".mp4")
          ? mockImageResponse(new Uint8Array([7]), "video/mp4")
          : mockImageResponse(),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await resolveShareVideoFile("https://cdn.example/share_a.mp4");
    await resolveShareImageFile("https://cdn.example/combo__a.webp", null);

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: { origin: "https://app.example" },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      levelName: "Neukölln – Level 1",
      videoUrl: "https://cdn.example/share_a.mp4",
      imageUrl: "https://cdn.example/combo__a.webp",
    });

    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.files?.[0]?.name).toBe(
      "schwammtastische-vision-neukolln-level-1.mp4",
    );
    expect(payload.files?.[0]?.type).toBe("video/mp4");
  });

  it("uses image when platform cannot share video files", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(
          url.endsWith(".mp4")
            ? mockImageResponse(new Uint8Array([7]), "video/mp4")
            : mockImageResponse(),
        ),
      ),
    );
    await resolveShareVideoFile("https://cdn.example/share_a.mp4");
    await resolveShareImageFile("https://cdn.example/combo__a.webp", null);

    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn(
        (data: ShareData) => data.files?.[0]?.type.startsWith("image/") ?? true,
      ),
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: { origin: "https://app.example" },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      videoUrl: "https://cdn.example/share_a.mp4",
      imageUrl: "https://cdn.example/combo__a.webp",
    });

    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.files?.[0]?.name).toBe("combo__a.webp");
  });

  it("uses current page when pageUrl is cross-origin media", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/level/foo/share?combo=baum",
        origin: "https://app.example",
      },
    });

    await shareLevelNative({
      pageUrl: "https://cdn.example/combo__a.mp4",
      text: "Custom share",
    });

    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.url).toBe(
      "https://app.example/level/foo/share?combo=baum",
    );
  });

  it("does not retry share after failure (keeps mobile user gesture)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const denied = new DOMException("Denied", "NotAllowedError");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockImageResponse()));
    await resolveShareImageFile("https://cdn.example/finished.webp", null);

    const share = vi
      .fn()
      .mockRejectedValueOnce(denied);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/level",
        origin: "https://app.example",
      },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      text: "Custom",
      imageUrl: "https://cdn.example/finished.webp",
    });

    expect(share).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledExactlyOnceWith("[shareLevelVideo:nativeShare]", denied);
  });

  it("shares text and url without files when image not primed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, blob: async () => new Blob() }),
    );
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", {
      share,
      canShare,
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/level",
        origin: "https://app.example",
      },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      text: "Custom share",
      imageUrl: "https://cdn.example/missing.webp",
      fallbackImageUrl: "https://cdn.example/also-missing.webp",
    });

    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.text).toBe("Custom share");
    expect(payload.url).toBe("https://app.example/share");
    expect(payload.files).toBeUndefined();
  });

  it("replaces [[LINK]] with the app start page url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, blob: async () => new Blob() }),
    );
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText: vi.fn() },
    });
    vi.stubGlobal("window", {
      location: {
        href: "https://app.example/level/foo",
        origin: "https://app.example",
      },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      text: "Spiel mit: [[LINK]]",
    });

    const payload = share.mock.calls[0][0] as ShareData;
    expect(payload.text).toBe("Spiel mit: https://app.example/");
  });

  it("copies share text to clipboard for apps that ignore Web Share text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      share,
      canShare: vi.fn().mockReturnValue(true),
      clipboard: { writeText },
    });
    vi.stubGlobal("window", {
      location: { origin: "https://app.example" },
    });

    await shareLevelNative({
      pageUrl: "https://app.example/share",
      text: "Berlin braucht mehr Schwammstadt-Power.",
    });

    expect(writeText).toHaveBeenCalledWith(
      "Berlin braucht mehr Schwammstadt-Power.\nhttps://app.example/share",
    );
  });
});

describe("resolveShareClipboardText", () => {
  it("appends url when missing from text", () => {
    expect(
      resolveShareClipboardText("Hallo Berlin", "https://app.example/"),
    ).toBe("Hallo Berlin\nhttps://app.example/");
  });

  it("keeps text when url already embedded", () => {
    expect(
      resolveShareClipboardText(
        "Spiel: https://app.example/",
        "https://app.example/",
      ),
    ).toBe("Spiel: https://app.example/");
  });
});

describe("shareLevelViaPlatform", () => {
  afterEach(() => {
    clearShareFileCache();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("copies share text and opens LinkedIn with url on desktop", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });
    vi.stubGlobal("window", {
      location: { origin: "https://app.example" },
      open,
    });

    await shareLevelViaPlatform("linkedin", {
      pageUrl: "https://app.example/share",
      text: "Berlin braucht mehr Schwammstadt-Power.",
    });

    expect(writeText).toHaveBeenCalledWith(
      "Berlin braucht mehr Schwammstadt-Power.\nhttps://app.example/share",
    );
    expect(open).toHaveBeenCalledWith(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fapp.example%2Fshare",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
