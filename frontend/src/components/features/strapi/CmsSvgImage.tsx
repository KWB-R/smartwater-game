import { useEffect, useState } from "react";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

export function isCmsSvgUrl(url: string): boolean {
  try {
    return new URL(url, "https://local.invalid").pathname
      .toLowerCase()
      .endsWith(".svg");
  } catch {
    return /\.svg(?:[?#]|$)/i.test(url);
  }
}

/** Entfernt Skripte; CSS bestimmt die Bildgröße. */
function prepareSvgMarkup(raw: string): string | null {
  const parsed = new DOMParser().parseFromString(raw, "image/svg+xml");
  const svg = parsed.documentElement;
  if (
    svg.querySelector("parsererror") ||
    svg.tagName.toLowerCase() !== "svg"
  ) {
    return null;
  }
  for (const el of svg.querySelectorAll("script")) {
    el.remove();
  }
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");
  if (!svg.getAttribute("viewBox")) {
    const w = svg.getAttribute("width");
    const h = svg.getAttribute("height");
    if (w && h && /^\d+(\.\d+)?$/.test(w) && /^\d+(\.\d+)?$/.test(h)) {
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
  }
  // width und height als natürliche Bildgröße erhalten, damit fit-content nicht zusammenfällt.
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return new XMLSerializer().serializeToString(svg);
}

/**
 * Bindet CMS-SVGs direkt als Vektoren in das DOM ein.
 * Der App-Rahmen verwendet contain: paint für fixierte Overlays; darin können SVGs als img unscharf werden.
 * Bei einem fehlgeschlagenen Abruf ein normales img verwenden.
 */
export function CmsSvgImage({ src, alt, className }: Props) {
  const [markup, setMarkup] = useState<string | null>(null);
  const [corsFetchFailed, setCorsFetchFailed] = useState(false);

  useEffect(() => {
    if (!isCmsSvgUrl(src)) {
      setMarkup(null);
      setCorsFetchFailed(false);
      return;
    }

    let cancelled = false;
    setMarkup(null);
    setCorsFetchFailed(false);

    void (async () => {
      try {
        const res = await fetch(src, { mode: "cors", credentials: "omit" });
        if (!res.ok) throw new Error(`svg fetch ${res.status}`);
        const prepared = prepareSvgMarkup(await res.text());
        if (cancelled) return;
        setMarkup(prepared);
      } catch {
        if (!cancelled) {
          setMarkup(null);
          setCorsFetchFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (markup != null) {
    return (
      <span
        className={cn("cms-svg-image", className)}
        role="img"
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      // Nach einem CORS-Fehler crossOrigin weglassen, damit das Ersatzbild geladen werden kann.
      crossOrigin={
        corsFetchFailed ? undefined : strapiImgCrossOrigin(src)
      }
      decoding="async"
      draggable={false}
    />
  );
}
