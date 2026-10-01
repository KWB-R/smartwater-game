import { useEffect } from "react";
import {
  primeShareImageFile,
  primeShareVideoFile,
} from "@/features/level/services/shareLevelVideo";

/** Bereitet Dateien zum Teilen vor, damit der spätere Klick ohne Wartezeit die native Freigabe öffnet. */
export function usePrimeShareFiles(
  active: boolean,
  videoUrl?: string | null,
  imageUrl?: string | null,
  fallbackImageUrl?: string | null,
): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    primeShareVideoFile(videoUrl);
    primeShareImageFile(imageUrl, fallbackImageUrl);
  }, [active, videoUrl, imageUrl, fallbackImageUrl]);
}
