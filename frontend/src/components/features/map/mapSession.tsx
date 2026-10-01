import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchDistrictById } from "@/api/services/bezirkService";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import type { District, DistrictLevelSummary } from "@/types/content";
import {
  withoutViewTransition,
  withViewTransition,
} from "@/lib/navigateWithViewTransition";
import { isGalleriePathname, ROUTES } from "@/routes/paths";
import { useLevelHeaderSnapshot } from "@/features/level/hooks/useLevelHeaderSnapshot";
import { isLevelVisibleOnMap } from "@/features/map/mapBonusLevelUnlock";
import {
  defaultMapSelectedLevelKey,
  levelMatchesRouteParam,
  levelProgressKey,
  levelRouteSlug,
} from "@/features/level/levelProgress";
import { findDistrictByRouteParam } from "@/features/map/berlinMapLayout";
import {
  getLevelDetailReturnTo,
  getRouteLevelStartKey,
  isMapDistrictDetailPathname,
  mapDistrictDetailLocation,
  matchMapDistrictDetailPathname,
  resolveMapDetailLevelKey,
} from "@/features/map/mapDistrictDetailUrl";
import {
  readMapPostLevelCelebration,
  readMapPostLevelCelebrationDistrictRouteId,
  isMapPostLevelDetailPending,
} from "@/features/map/mapPostLevelCelebration";
import type { MapReturnFromShareLocationState } from "@/features/map/mapPostLevelCelebrationState";
import {
  clearMapReturnFromShareState,
  peekMapReturnFromShareState,
  peekMapReturnFromShareStateForDistrict,
  resolveMapNavigationState,
  stashMapReturnFromShareState,
} from "@/features/map/mapPostLevelCelebrationStorage";
import {
  MapSessionContext,
  type MapSessionValue,
} from "@/features/map/mapSessionContext";

const EMPTY_DISTRICTS: District[] = [];

function levelKey(level: DistrictLevelSummary): string {
  return levelProgressKey(level);
}

export function MapSessionProvider({
  children,
  districtsFromList = EMPTY_DISTRICTS,
}: {
  children: ReactNode;
  districtsFromList?: District[];
}) {
  const { districtId: districtIdParam, levelKey: levelKeyParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedLevelKey, setSelectedLevelKey] = useState<string | null>(null);
  const [levelStartOpen, setLevelStartOpen] = useState(false);
  const [mapDetailPeekTopPx, setMapDetailPeekTopPx] = useState<number | null>(
    null,
  );
  const selectionDistrictIdRef = useRef<string | null>(null);

  const detailPathMatch = useMemo(
    () => matchMapDistrictDetailPathname(location.pathname),
    [location.pathname],
  );

  const celebrationDistrictRouteId = useMemo(
    () => readMapPostLevelCelebrationDistrictRouteId(location.state),
    [location.state],
  );

  /** Bezirk aus der URL oder dem Abschlusszustand, wenn das Sheet direkt auf /karte geöffnet wird. */
  const districtId = districtIdParam ?? celebrationDistrictRouteId ?? undefined;

  const listDistrict = useMemo(
    () =>
      districtId
        ? findDistrictByRouteParam(districtsFromList, districtId)
        : undefined,
    [districtId, districtsFromList],
  );

  /** Mit bekannter documentId direkt den Dokumentpfad verwenden. */
  const detailApiId =
    listDistrict?.documentId?.trim() || districtId || undefined;

  const detailResource = useAsyncResource(
    (signal) =>
      detailApiId
        ? fetchDistrictById(detailApiId, signal)
        : Promise.resolve(null),
    [detailApiId],
  );

  const fetchedDistrict =
    detailResource.status === "success" ? detailResource.data : null;

  const district = fetchedDistrict ?? listDistrict ?? null;

  const navigationState = useMemo(
    () => resolveMapNavigationState(location.state, districtId ?? null),
    [location.state, districtId],
  );

  useEffect(() => {
    if (!districtId) {
      selectionDistrictIdRef.current = null;
      setSelectedLevelKey(null);
      setLevelStartOpen(false);
      setMapDetailPeekTopPx(null);
      return;
    }
    if (selectionDistrictIdRef.current !== districtId) {
      selectionDistrictIdRef.current = districtId;
      setSelectedLevelKey(null);
      const keepDetailOpen =
        isMapDistrictDetailPathname(location.pathname) ||
        isMapPostLevelDetailPending(location.state) ||
        readMapPostLevelCelebration(location.state, {
          districtRouteId: districtId,
        }) != null;
      if (!keepDetailOpen) {
        setLevelStartOpen(false);
      }
    }
  }, [districtId, location.pathname, location.state]);

  useEffect(() => {
    const stashed = districtIdParam
      ? peekMapReturnFromShareStateForDistrict(districtIdParam)
      : peekMapReturnFromShareState();
    if (!stashed) {
      return;
    }
    if (isGalleriePathname(location.pathname)) {
      // Bei Rückkehr zur Galerie deren Route erhalten.
      clearMapReturnFromShareState();
      return;
    }
    const onMapRoot = location.pathname === ROUTES.map;
    const needsState =
      readMapPostLevelCelebration(location.state, {
        districtRouteId: celebrationDistrictRouteId,
      }) == null;

    if (onMapRoot) {
      if (!needsState) {
        return;
      }
      navigate(
        ROUTES.map,
        withoutViewTransition({
          replace: true,
          state: stashed,
        }),
      );
      return;
    }

    const celebrationRouteId =
      typeof stashed.celebrationDistrictRouteId === "string"
        ? stashed.celebrationDistrictRouteId.trim()
        : "";
    const activeDistrictId =
      districtIdParam?.trim() || celebrationRouteId || null;
    if (!activeDistrictId) {
      return;
    }
    const onDetailForDistrict =
      detailPathMatch?.districtRouteId === activeDistrictId;
    const alreadyHasState =
      readMapPostLevelCelebration(location.state, {
        districtRouteId: activeDistrictId,
      }) != null;

    if (alreadyHasState && onDetailForDistrict) {
      return;
    }

    if (onDetailForDistrict) {
      navigate(
        location.pathname,
        withoutViewTransition({
          replace: true,
          state: stashed,
        }),
      );
      return;
    }

    // Nach dem Levelabschluss zur Kartenübersicht zurückkehren.
    navigate(
      ROUTES.map,
      withoutViewTransition({
        replace: true,
        state: stashed,
      }),
    );
  }, [
    districtIdParam,
    celebrationDistrictRouteId,
    location.pathname,
    location.state,
    navigate,
    detailPathMatch?.districtRouteId,
  ]);

  useEffect(() => {
    if (!districtId || !district) {
      return;
    }
    if (selectionDistrictIdRef.current !== districtId) {
      return;
    }
    setSelectedLevelKey(
      (current) =>
        current ??
        defaultMapSelectedLevelKey(
          district.levels.filter((level) =>
            isLevelVisibleOnMap(district, level),
          ),
        ),
    );
  }, [districtId, district]);

  useEffect(() => {
    if (isGalleriePathname(location.pathname)) {
      // Eine Levelauswahl aus dem Abschlusszustand darf die Galerie nicht mit Kartendetails überdecken.
      setLevelStartOpen(false);
      return;
    }
    if (!districtId || !district) {
      return;
    }
    const postLevelCelebration = readMapPostLevelCelebration(location.state, {
      districtRouteId: districtId,
    });
    const detailPending = isMapPostLevelDetailPending(navigationState);
    const detailFromPath =
      detailPathMatch != null &&
      detailPathMatch.districtRouteId === districtId;
    const routeLevelStartKey =
      (typeof levelKeyParam === "string" && levelKeyParam.trim()
        ? levelKeyParam.trim()
        : null) ?? getRouteLevelStartKey(navigationState);
    if (
      !detailFromPath &&
      !routeLevelStartKey &&
      !postLevelCelebration
    ) {
      setLevelStartOpen(false);
      return;
    }
    const key = resolveMapDetailLevelKey(district, routeLevelStartKey);
    if (!key) {
      return;
    }
    setSelectedLevelKey(key);
    if (postLevelCelebration && detailPending) {
      setLevelStartOpen(true);
      return;
    }
    if (postLevelCelebration && !detailFromPath) {
      setLevelStartOpen(false);
      return;
    }
    setLevelStartOpen(true);
  }, [
    districtId,
    district,
    navigationState,
    location.state,
    location.pathname,
    detailPathMatch,
    levelKeyParam,
  ]);

  const selectedLevel = useMemo(() => {
    if (!district || selectedLevelKey == null) {
      return null;
    }
    return (
      district.levels.find((l) => levelKey(l) === selectedLevelKey) ??
      district.levels[0] ??
      null
    );
  }, [district, selectedLevelKey]);

  const levelHeaderSnapshot = useLevelHeaderSnapshot(selectedLevelKey);

  const missionMaxScore = Math.max(
    1,
    levelHeaderSnapshot?.maxPuzzleItems ?? levelHeaderSnapshot?.maxScore ?? 1,
  );
  const missionScore = Math.min(
    missionMaxScore,
    Math.max(
      0,
      levelHeaderSnapshot?.placedCount ??
        Math.round(levelHeaderSnapshot?.displayScore ?? 0),
    ),
  );

  const closeDistrict = useCallback(() => {
    setLevelStartOpen(false);
    navigate(ROUTES.map, withViewTransition());
  }, [navigate]);

  const openLevelStart = useCallback(() => {
    if (!districtIdParam || !district) {
      return;
    }
    clearMapReturnFromShareState();
    setLevelStartOpen(true);
    const routeLevelKey = selectedLevel
      ? levelRouteSlug(selectedLevel)
      : selectedLevelKey;
    navigate(
      mapDistrictDetailLocation(districtIdParam, {
        detail: true,
        levelKey: routeLevelKey,
      }),
      withViewTransition({
        replace: true,
        state: selectedLevelKey ? { levelStartKey: selectedLevelKey } : null,
      }),
    );
  }, [navigate, districtIdParam, district, selectedLevel, selectedLevelKey]);

  const openLevelStartForLevel = useCallback(
    (key: string) => {
      if (!districtIdParam || !district) {
        return;
      }
      clearMapReturnFromShareState();
      setSelectedLevelKey(key);
      setLevelStartOpen(true);
      const level =
        district.levels.find(
          (entry) =>
            levelProgressKey(entry) === key ||
            levelMatchesRouteParam(entry, key),
        ) ?? null;
      navigate(
        mapDistrictDetailLocation(districtIdParam, {
          detail: true,
          levelKey: level ? levelRouteSlug(level) : key,
        }),
        withViewTransition({ replace: true, state: { levelStartKey: key } }),
      );
    },
    [navigate, districtIdParam, district],
  );

  const closeLevelStart = useCallback(() => {
    clearMapReturnFromShareState();
    setLevelStartOpen(false);
    setMapDetailPeekTopPx(null);
    const returnTo = getLevelDetailReturnTo(location.state);
    navigate(
      returnTo ?? ROUTES.map,
      withViewTransition({ replace: true, state: null }),
    );
  }, [location.state, navigate]);

  /** Schließt das Detail-Sheet auf /karte und gibt das Kartenintro frei. */
  const closeLevelStartAfterPostLevelCelebration = useCallback(
    (_options?: { bonusUnlockDistrictRouteId?: string }) => {
      setLevelStartOpen(false);
      setMapDetailPeekTopPx(null);
      const mergedState = resolveMapNavigationState(
        location.state,
        districtId ?? null,
      );
      const celebration = readMapPostLevelCelebration(mergedState, {
        districtRouteId: districtId ?? null,
      });
      if (
        !celebration ||
        typeof mergedState !== "object" ||
        mergedState === null
      ) {
        clearMapReturnFromShareState();
        navigate(
          ROUTES.map,
          withViewTransition({ replace: true, state: null }),
        );
        return;
      }
      const {
        mapPostLevelDetailPending: _detailPending,
        mapPostLevelMapIntroDone: _introDone,
        ...rest
      } = mergedState as MapReturnFromShareLocationState & {
        mapPostLevelDetailPending?: unknown;
        mapPostLevelMapIntroDone?: unknown;
      };
      const introState = rest as MapReturnFromShareLocationState;
      stashMapReturnFromShareState(introState);
      navigate(
        ROUTES.map,
        withViewTransition({ replace: true, state: introState }),
      );
    },
    [districtId, location.state, navigate],
  );

  /** Entfernt nach dem Kartenintro den Abschlusszustand und bleibt auf /karte. */
  const finishMapPostLevelMapIntro = useCallback(() => {
    clearMapReturnFromShareState();
    if (isGalleriePathname(location.pathname)) {
      return;
    }
    navigate(
      ROUTES.map,
      withoutViewTransition({ replace: true, state: null }),
    );
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (!levelStartOpen) {
      setMapDetailPeekTopPx(null);
    }
  }, [levelStartOpen]);

  const detailError =
    detailResource.status === "error" ? detailResource.error : undefined;
  const value: MapSessionValue = useMemo(
    () => ({
      districtId,
      district,
      detailStatus: detailResource.status,
      detailError,
      selectedLevel,
      selectedLevelKey,
      selectLevel: setSelectedLevelKey,
      missionScore,
      missionMaxScore,
      levelHeaderSnapshot,
      levelStartOpen,
      openLevelStart,
      openLevelStartForLevel,
      closeLevelStart,
      closeLevelStartAfterPostLevelCelebration,
      finishMapPostLevelMapIntro,
      closeDistrict,
      mapDetailPeekTopPx,
      setMapDetailPeekTopPx,
    }),
    [
      districtId,
      district,
      detailResource.status,
      detailError,
      selectedLevel,
      selectedLevelKey,
      missionScore,
      missionMaxScore,
      levelHeaderSnapshot,
      levelStartOpen,
      openLevelStart,
      openLevelStartForLevel,
      closeLevelStart,
      closeLevelStartAfterPostLevelCelebration,
      finishMapPostLevelMapIntro,
      closeDistrict,
      mapDetailPeekTopPx,
    ],
  );

  return (
    <MapSessionContext.Provider value={value}>
      {children}
    </MapSessionContext.Provider>
  );
}

export function useMapSession(): MapSessionValue {
  const ctx = useContext(MapSessionContext);
  if (!ctx) {
    throw new Error("useMapSession must be used within MapSessionProvider");
  }
  return ctx;
}

export function useMapSessionOptional(): MapSessionValue | null {
  return useContext(MapSessionContext);
}
