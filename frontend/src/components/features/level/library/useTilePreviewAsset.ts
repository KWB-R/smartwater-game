import { useEffect, useRef, useState } from "react";
import { toSameOriginAbsoluteAssetUrl } from "@/features/level/services/levelAssetUrls";
import { preloadImageDecode } from "@/features/level/utils/preloadImageDecode";
import {
  fetchAssetBlobWithProgress,
  shouldLoadImageDirectly,
} from "@/features/level/services/assetBlobFetch";

export type TilePreviewAssetState = {
  progress: number;
  indeterminate: boolean;
  ready: boolean;
  error: boolean;
  /** Entweder `blob:`-URL nach Fetch oder direkte http(s)-/Pfad-URL für dasselbe `<img>`. */
  blobUrl: string | null;
};

const readyPreviewByUrl = new Map<string, TilePreviewAssetState>();

const INITIAL_PREVIEW_STATE: TilePreviewAssetState = {
  progress: 0,
  indeterminate: false,
  ready: false,
  error: false,
  blobUrl: null,
};

function rememberReadyPreview(url: string, state: TilePreviewAssetState): void {
  if (!state.ready || !state.blobUrl) {
    return;
  }
  readyPreviewByUrl.set(url, state);
}

/** Lädt die Vorschau-URL einmal mit optionalem Byte-Fortschritt, decodiert das Bild — für Fortschrittsanzeige in der Bibliothek. */
export function useTilePreviewAsset(absoluteUrl: string): TilePreviewAssetState {
  const resolvedUrl = toSameOriginAbsoluteAssetUrl(absoluteUrl);
  const [state, setState] = useState<TilePreviewAssetState>(() => {
    if (!resolvedUrl.trim()) {
      return INITIAL_PREVIEW_STATE;
    }
    return readyPreviewByUrl.get(resolvedUrl) ?? INITIAL_PREVIEW_STATE;
  });
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!resolvedUrl.trim()) {
      setState(INITIAL_PREVIEW_STATE);
      return;
    }

    const cached = readyPreviewByUrl.get(resolvedUrl);
    if (cached?.ready) {
      setState(cached);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    const revokeOwnedBlob = () => {
      if (blobUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = null;
    };

    setState(INITIAL_PREVIEW_STATE);

    void (async () => {
      try {
        if (shouldLoadImageDirectly(resolvedUrl)) {
          if (!cancelled) {
            setState((s) => ({ ...s, progress: 0, indeterminate: true }));
          }
          await preloadImageDecode(resolvedUrl);
          if (cancelled) return;
          const done: TilePreviewAssetState = {
            progress: 1,
            indeterminate: false,
            ready: true,
            error: false,
            blobUrl: resolvedUrl,
          };
          rememberReadyPreview(resolvedUrl, done);
          setState(done);
          return;
        }

        const blob = await fetchAssetBlobWithProgress(
          resolvedUrl,
          (p, ind) => {
            if (!cancelled) {
              setState((s) => ({
                ...s,
                progress: p,
                indeterminate: ind,
              }));
            }
          },
          ac.signal,
        );
        if (cancelled) return;
        revokeOwnedBlob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        await preloadImageDecode(url);
        if (cancelled) {
          URL.revokeObjectURL(url);
          blobUrlRef.current = null;
          return;
        }
        const done: TilePreviewAssetState = {
          progress: 1,
          indeterminate: false,
          ready: true,
          error: false,
          blobUrl: url,
        };
        rememberReadyPreview(resolvedUrl, done);
        blobUrlRef.current = null;
        setState(done);
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) {
          return;
        }
        revokeOwnedBlob();
        if (!cancelled) {
          setState({
            progress: 0,
            indeterminate: false,
            ready: false,
            error: true,
            blobUrl: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
      revokeOwnedBlob();
    };
  }, [resolvedUrl]);

  return state;
}
