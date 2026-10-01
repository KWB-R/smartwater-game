import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { District } from "@/types/content";
import {
  installMapCelebrationDevReplayGlobal,
  triggerMapCelebrationDevReplay,
} from "@/features/map/mapPostLevelCelebrationDevReplay";

/** Dev: `?replayMapCelebration=1` oder `swgReplayMapCelebration()` in der Konsole. */
export function useMapCelebrationDevReplay(
  districts: District[],
  districtRouteId: string | undefined,
): void {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    return installMapCelebrationDevReplayGlobal({
      districts,
      districtRouteId,
      navigate,
    });
  }, [districts, districtRouteId, navigate]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    if (searchParams.get("replayMapCelebration") !== "1") {
      return;
    }
    const routeId = districtRouteId?.trim();
    if (!routeId) {
      return;
    }
    // Zuerst das Detail auf /karte zeigen, danach beim Schließen das Kartenintro starten.
    triggerMapCelebrationDevReplay({
      districts,
      districtRouteId: routeId,
      navigate,
    });
    searchParams.delete("replayMapCelebration");
    setSearchParams(searchParams, { replace: true });
  }, [
    districts,
    districtRouteId,
    navigate,
    searchParams,
    setSearchParams,
  ]);
}
