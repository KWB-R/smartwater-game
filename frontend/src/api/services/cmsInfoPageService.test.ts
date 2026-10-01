import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrapiFetchError, strapiFetch } from "@/api/client";
import { isStrapiConfigured } from "@/lib/env";
import {
  fetchDesktopPage,
  fetchNotFoundPage,
  fetchPlaceholderPage,
} from "./cmsInfoPageService";

vi.mock("@/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/client")>(),
  strapiFetch: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ isStrapiConfigured: vi.fn() }));

const pages = [
  { path: "/desktoppage", load: fetchDesktopPage },
  { path: "/not-found-page", load: fetchNotFoundPage },
  { path: "/placeholderpage", load: fetchPlaceholderPage },
];
const content = [{ type: "paragraph", children: [{ type: "text", text: "Info" }] }];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isStrapiConfigured).mockReturnValue(true);
});

describe.each(pages)("CMS-Informationsseite $path", ({ path, load }) => {
  it("lädt und übernimmt den Blocks-Inhalt", async () => {
    vi.mocked(strapiFetch).mockResolvedValue({ data: { id: 1, content } });
    await expect(load()).resolves.toEqual({ content });
    expect(strapiFetch).toHaveBeenCalledExactlyOnceWith(path);
  });

  it("liefert ohne CMS-Konfiguration einen leeren Inhalt ohne Anfrage", async () => {
    vi.mocked(isStrapiConfigured).mockReturnValue(false);
    await expect(load()).resolves.toEqual({ content: null });
    expect(strapiFetch).not.toHaveBeenCalled();
  });

  it.each([null, {}, { content: null }])("akzeptiert fehlenden Inhalt: %j", async (data) => {
    vi.mocked(strapiFetch).mockResolvedValue({ data });
    await expect(load()).resolves.toEqual({ content: null });
  });

  it.each([403, 404])("verwendet bei HTTP %i den leeren Ersatzinhalt", async (status) => {
    vi.mocked(strapiFetch).mockRejectedValue(new StrapiFetchError("Fehler", status));
    await expect(load()).resolves.toEqual({ content: null });
  });

  it("gibt Serverfehler weiter", async () => {
    const cause = new StrapiFetchError("Serverfehler", 500);
    vi.mocked(strapiFetch).mockRejectedValue(cause);
    await expect(load()).rejects.toMatchObject({ kind: "strapi", status: 500, cause });
  });

  it("weist ungültigen Blocks-Inhalt zurück", async () => {
    vi.mocked(strapiFetch).mockResolvedValue({ data: { content: "kein Blocks-Array" } });
    await expect(load()).rejects.toMatchObject({ kind: "unknown" });
  });

  it("teilt laufende Anfragen, lädt nach Abschluss aber erneut", async () => {
    vi.mocked(strapiFetch).mockResolvedValue({ data: { content } });
    const first = load();
    expect(load()).toBe(first);
    await first;
    expect(strapiFetch).toHaveBeenCalledTimes(1);
    await load();
    expect(strapiFetch).toHaveBeenCalledTimes(2);
  });

  it("erlaubt einen neuen Abruf nach einem Fehler", async () => {
    vi.mocked(strapiFetch).mockRejectedValueOnce(new Error("offline"));
    await expect(load()).rejects.toMatchObject({ message: "offline" });
    vi.mocked(strapiFetch).mockResolvedValue({ data: { content } });
    await expect(load()).resolves.toEqual({ content });
    expect(strapiFetch).toHaveBeenCalledTimes(2);
  });
});

it("hält gleichzeitige Anfragen verschiedener Informationsseiten getrennt", async () => {
  vi.mocked(strapiFetch).mockResolvedValue({ data: null });
  await Promise.all(pages.map(({ load }) => load()));
  expect(vi.mocked(strapiFetch).mock.calls.map(([path]) => path)).toEqual(
    pages.map(({ path }) => path),
  );
});
