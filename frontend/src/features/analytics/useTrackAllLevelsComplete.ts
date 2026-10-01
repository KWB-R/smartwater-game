import { useEffect, useRef } from "react";
import { trackAllLevelsComplete } from "@/features/analytics/trackAllLevelsComplete";

/** Meldet einmal den Abschluss aller Hauptlevel. */
export function useTrackAllLevelsComplete(allPrimaryLevelsComplete: boolean): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!allPrimaryLevelsComplete || firedRef.current) {
      return;
    }
    firedRef.current = true;
    trackAllLevelsComplete();
  }, [allPrimaryLevelsComplete]);
}
