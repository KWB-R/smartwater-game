import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  districtRouteId,
  findDistrictByRouteParam,
} from "@/features/map/berlinMapLayout";
import type { District } from "@/types/content";
import { withoutViewTransition } from "@/lib/navigateWithViewTransition";
import {
  clearBonusLevelsRevealed,
  findDistrictPendingBonusUnlock,
  hasUnrevealedBonusLevels,
  markBonusLevelsRevealed,
  readBonusUnlockDistrictRouteId,
} from "@/features/map/mapBonusLevelUnlock";
import {
  isMapPostLevelDetailFlowActive,
  isMapPostLevelMapIntroActive,
} from "@/features/map/mapPostLevelCelebration";
import { readMapCelebrationDevReplayNonce } from "@/features/map/mapPostLevelCelebrationDevReplay";

export type BonusRevealCelebration = {
  districtRouteId: string;
  key: number;
};

export function useMapBonusUnlockOverlay(
  districts: District[],
  districtRouteIdParam?: string | null,
): {
  overlayDistrict: District | null;
  dismissBonusUnlock: () => void;
  bonusRevealedRevision: number;
  bonusRevealCelebration: BonusRevealCelebration | null;
  clearBonusRevealCelebration: () => void;
  beginBonusRevealCelebration: (district: District) => void;
  commitBonusLevelsRevealed: (districtRouteId: string) => void;
} {
  const location = useLocation();
  const navigate = useNavigate();
  const [overlayDistrict, setOverlayDistrict] = useState<District | null>(null);
  const [bonusRevealedRevision, setBonusRevealedRevision] = useState(0);
  const [bonusRevealCelebration, setBonusRevealCelebration] =
    useState<BonusRevealCelebration | null>(null);
  const revealedRouteIdsRef = useRef<Set<string>>(new Set());
  const stagedCelebrationRouteIdsRef = useRef<Set<string>>(new Set());
  const lastDevReplayNonceRef = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    const nonce = readMapCelebrationDevReplayNonce(location.state);
    if (!nonce || nonce === lastDevReplayNonceRef.current) {
      return;
    }
    lastDevReplayNonceRef.current = nonce;
    const routeParam = districtRouteIdParam?.trim();
    if (!routeParam) {
      return;
    }
    const district = findDistrictByRouteParam(districts, routeParam);
    const id = district ? districtRouteId(district) : routeParam;
    clearBonusLevelsRevealed(id);
    revealedRouteIdsRef.current.delete(id);
    stagedCelebrationRouteIdsRef.current.delete(id);
    setOverlayDistrict(null);
    setBonusRevealCelebration(null);
    setBonusRevealedRevision((n) => n + 1);
  }, [location.state, districtRouteIdParam, districts]);

  const commitBonusLevelsRevealed = useCallback((routeId: string) => {
    const id = routeId.trim();
    if (!id || revealedRouteIdsRef.current.has(id)) {
      return;
    }
    revealedRouteIdsRef.current.add(id);
    stagedCelebrationRouteIdsRef.current.delete(id);
    markBonusLevelsRevealed(id);
    setBonusRevealedRevision((n) => n + 1);
  }, []);

  const beginBonusRevealCelebration = useCallback((district: District) => {
    const routeId = districtRouteId(district);
    if (
      revealedRouteIdsRef.current.has(routeId) ||
      stagedCelebrationRouteIdsRef.current.has(routeId)
    ) {
      return;
    }
    stagedCelebrationRouteIdsRef.current.add(routeId);
    setOverlayDistrict(district);
  }, []);

  const dismissBonusUnlock = useCallback(() => {
    if (!overlayDistrict) {
      return;
    }
    const routeId = districtRouteId(overlayDistrict);
    commitBonusLevelsRevealed(routeId);
    setBonusRevealCelebration({ districtRouteId: routeId, key: Date.now() });
    setOverlayDistrict(null);

    if (readBonusUnlockDistrictRouteId(location.state)) {
      navigate(
        { pathname: location.pathname, hash: location.hash },
        withoutViewTransition({ replace: true, state: null }),
      );
    }
  }, [
    overlayDistrict,
    location.hash,
    location.pathname,
    location.state,
    navigate,
    commitBonusLevelsRevealed,
  ]);

  useEffect(() => {
    if (
      isMapPostLevelDetailFlowActive({
        ...location,
        districtRouteId: districtRouteIdParam ?? null,
      })
    ) {
      // Bei offenem Detail den Bonusablauf freigeben, damit er anschließend neu starten kann.
      setOverlayDistrict((current) => {
        if (current) {
          stagedCelebrationRouteIdsRef.current.delete(districtRouteId(current));
        }
        return null;
      });
      return;
    }

    if (
      isMapPostLevelMapIntroActive({
        pathname: location.pathname,
        state: location.state,
        districtRouteId: districtRouteIdParam ?? null,
      })
    ) {
      return;
    }

    if (overlayDistrict) {
      return;
    }

    const routeIdFromState = readBonusUnlockDistrictRouteId(location.state);
    if (routeIdFromState) {
      const fromState = findDistrictByRouteParam(districts, routeIdFromState);
      if (fromState && hasUnrevealedBonusLevels(fromState)) {
        beginBonusRevealCelebration(fromState);
        return;
      }
    }

    const pending = findDistrictPendingBonusUnlock(districts);
    if (pending) {
      beginBonusRevealCelebration(pending);
    }
  }, [
    districts,
    location,
    districtRouteIdParam,
    bonusRevealedRevision,
    overlayDistrict,
    beginBonusRevealCelebration,
  ]);

  const clearBonusRevealCelebration = useCallback(() => {
    setBonusRevealCelebration(null);
  }, []);

  return {
    overlayDistrict,
    dismissBonusUnlock,
    bonusRevealedRevision,
    bonusRevealCelebration,
    clearBonusRevealCelebration,
    beginBonusRevealCelebration,
    commitBonusLevelsRevealed,
  };
}
