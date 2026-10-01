import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLatestRef } from "@/hooks/useLatestRef";
import { withViewTransition } from "@/lib/navigateWithViewTransition";
import {
  getRouteLevelStartKey,
  isMapDistrictDetailPathname,
  mapDistrictDetailLocation,
} from "@/features/map/mapDistrictDetailUrl";
import {
  consumeRememberedMapViewBox,
  rememberMapViewBox,
} from "@/features/map/mapViewBoxPersistence";
import {
  getMapZoomOutDistrictRoute,
  isMapZoomOutRequest,
} from "@/features/map/mapZoomOutNavigation";
import { useMapSessionOptional } from "./mapSession";
import berlinMapSvg from "@/internal_assets/map/berlin_schwamm_map.svg?raw";
import {
  BERLIN_MAP_DISTRICT_PATH_SELECTOR,
  parsePreparedBerlinMapSvg,
} from "@/features/map/prepareBerlinMapSvg";
import type { District } from "@/types/content";
import {
  buildLevelMapMarkers,
  districtRouteId,
  findDistrictByRouteParam,
  readDistrictAnchorsFromSvg,
  readDistrictBoundsFromSvg,
  unionDistrictPathBBox,
  type DistrictAnchor,
  type DistrictSvgBounds,
  type LevelMapMarker,
} from "@/features/map/berlinMapLayout";
import { MAP_OVERVIEW_VIEWBOX_WIDTH } from "@/features/map/berlinMapConstants";
import {
  defaultMapSelectedLevelKey,
  isMapLevelMaxMarkerProgress,
  levelProgressKey,
  levelRouteSlug,
} from "@/features/level/levelProgress";
import {
  isLevelVisibleOnMap,
  getBonusLevels,
  getPrimaryLevel,
} from "@/features/map/mapBonusLevelUnlock";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  MapBonusMarkerRevealParticles,
  type MapBonusMarkerBurstPoint,
} from "@/components/features/map/MapBonusMarkerRevealParticles";
import {
  clientPointFromMapSvg,
  explosionSpreadFromScreenSize,
  readDistrictBurstPointFromDom,
  readDistrictScreenRect,
  readMapMarkerBurstPointsFromDom,
} from "@/features/map/mapMarkerScreenPosition";
import type { BonusRevealCelebration } from "@/features/map/useMapBonusUnlockOverlay";
import { useMapPageProgress } from "@/features/map/useMapPageProgress";
import { mapDistrictLabelsOpacity, mapPageContentOpacity } from "@/features/map/mapPageContentOpacity";
import {
  MapDistrictLabelsLayer,
  buildVisibleDistrictLabels,
} from "./MapDistrictLabelsLayer";
import type { DistrictLevelMapMarkerPosition } from "@/types/content";
import {
  INITIAL_MAP_VIEW_BOX,
  mapDetailDistrictFocusAlign,
  useBerlinMapViewBox,
  viewBoxForSvgBBox,
  viewBoxToAttribute,
  type MapViewBox,
} from "@/features/map/useBerlinMapViewBox";
import { isMapPostLevelMapIntroActive } from "@/features/map/mapPostLevelCelebration";
import { applyBerlinMapDistrictPathStyles } from "@/features/map/berlinMapSvgClasses";
import { mapDetailSheetTopForFocus } from "@/features/map/mapDetailTiming";
import { MapMarkerLayer, type MapMarkerLayerMarker } from "./MapMarkerLayer";
import { mapMarkerProgressForIntroDefer } from "@/features/map/mapMarkerIntroProgress";

type Props = {
  districts: District[];
  selectedDistrictId?: string;
  onViewBoxChange?: (viewBox: MapViewBox) => void;
  /** Erhöhen, wenn Bonus-Level auf der Karte freigeschaltet wurden. */
  bonusRevealRevision?: number;
  bonusRevealCelebration?: BonusRevealCelebration | null;
  onBonusRevealCelebrationEnd?: () => void;
  /** Bonus-Marker sichtbar machen (gleichzeitig mit Burst). */
  onCommitBonusLevelsRevealed?: (districtRouteId: string) => void;
  /** Bezirke mit Fortschritt, die im Map-Intro noch grau bleiben. */
  deferHighlightedBezirkIds?: ReadonlySet<string>;
  /**
   * Schlüssel für den Partikeleffekt beim Einfärben des Bezirks.
   * Ein stabiler primitiver Wert verhindert, dass neue Objekte die laufende Animation ständig abbrechen.
   */
  districtHighlightBurstKey?: number;
  districtHighlightBurstBezirkId?: string | null;
  /** Bezirk und Marker beim Partikelstart gemeinsam aktualisieren. */
  onDistrictHighlightReveal?: () => void;
  /** Level-Pins bis Bezirk-Gelb noch als ungelöst (grün) darstellen. */
  deferMarkerSolvedAppearanceLevelKeys?: ReadonlySet<string>;
};

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function revealedDeferredKeys(
  prev: ReadonlySet<string> | undefined,
  next: ReadonlySet<string> | undefined,
): string[] {
  if (!prev?.size) {
    return [];
  }
  const revealed: string[] = [];
  for (const id of prev) {
    if (!next?.has(id)) {
      revealed.push(id);
    }
  }
  return revealed;
}

const DISTRICT_HIGHLIGHT_BURST_INTENSITY = 26;

function districtHighlightBurstPoint(params: {
  mapSvg: SVGSVGElement;
  markerSvg: SVGSVGElement | null;
  bezirkId: string;
  burstId: number;
  district: District | undefined;
  anchor: DistrictAnchor | undefined;
  bounds: DistrictSvgBounds | undefined;
}): MapBonusMarkerBurstPoint | null {
  const { mapSvg, markerSvg, bezirkId, burstId, district, anchor, bounds } =
    params;
  const screenRect = readDistrictScreenRect(mapSvg, bezirkId);
  let explosionSpreadPx = 220;
  if (screenRect) {
    explosionSpreadPx = explosionSpreadFromScreenSize(
      screenRect.width,
      screenRect.height,
    );
  } else if (bounds) {
    const topLeft = clientPointFromMapSvg(mapSvg, bounds.x, bounds.y);
    const bottomRight = clientPointFromMapSvg(
      mapSvg,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );
    explosionSpreadPx = explosionSpreadFromScreenSize(
      Math.abs(bottomRight.x - topLeft.x),
      Math.abs(bottomRight.y - topLeft.y),
    );
  }

  const primary = district ? getPrimaryLevel(district) : undefined;
  const markerKeys = new Set<string>();
  if (primary) {
    markerKeys.add(levelProgressKey(primary));
  } else if (district) {
    for (const level of district.levels) {
      markerKeys.add(levelProgressKey(level));
    }
  }
  const fromMarker =
    markerSvg && markerKeys.size > 0
      ? readMapMarkerBurstPointsFromDom(markerSvg, markerKeys, burstId)[0]
      : undefined;
  const fromPath = readDistrictBurstPointFromDom(mapSvg, bezirkId, burstId);
  const fromAnchor = anchor
    ? clientPointFromMapSvg(mapSvg, anchor.cx, anchor.cy)
    : null;
  const origin = fromMarker ?? fromPath ?? fromAnchor;
  if (!origin) {
    return null;
  }

  return {
    id: burstId,
    x: origin.x,
    y: origin.y,
    intensity: DISTRICT_HIGHLIGHT_BURST_INTENSITY,
    explosionSpreadPx,
  };
}

function markerVisibleInView(
  marker: LevelMapMarker,
  viewBox: MapViewBox,
  boundsByBezirkId: Map<string, DistrictSvgBounds>,
  selectedDistrictRouteId?: string | null,
): boolean {
  const markerDistrictRoute = districtRouteId(marker.district);
  if (
    selectedDistrictRouteId &&
    markerDistrictRoute === selectedDistrictRouteId
  ) {
    return true;
  }
  const bezirkId = marker.district.bezirkId?.trim();
  const bounds = bezirkId ? boundsByBezirkId.get(bezirkId) : undefined;
  if (bounds && rectsIntersect(bounds, viewBox)) {
    return true;
  }
  const pad = Math.max(viewBox.width * 0.02, 48);
  return (
    marker.x >= viewBox.x - pad &&
    marker.x <= viewBox.x + viewBox.width + pad &&
    marker.y >= viewBox.y - pad &&
    marker.y <= viewBox.y + viewBox.height + pad
  );
}

function districtFocusSignature(
  districtRouteId: string,
  mode: "detail" | "overview" | "map-intro",
): string {
  return `${districtRouteId}|${mode}`;
}

export function BerlinMap({
  districts,
  selectedDistrictId,
  onViewBoxChange,
  bonusRevealRevision = 0,
  bonusRevealCelebration = null,
  onBonusRevealCelebrationEnd,
  onCommitBonusLevelsRevealed,
  deferHighlightedBezirkIds,
  districtHighlightBurstKey = 0,
  districtHighlightBurstBezirkId = null,
  onDistrictHighlightReveal,
  deferMarkerSolvedAppearanceLevelKeys,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const markerLayerSvgRef = useRef<SVGSVGElement | null>(null);
  const districtLabelsSvgRef = useRef<SVGSVGElement | null>(null);
  const [revealAnimatingLevelKeys, setRevealAnimatingLevelKeys] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [markerBurstPoints, setMarkerBurstPoints] = useState<
    MapBonusMarkerBurstPoint[]
  >([]);
  const [districtHighlightBurstPoints, setDistrictHighlightBurstPoints] =
    useState<MapBonusMarkerBurstPoint[]>([]);
  /** Bezirk und Partikeleffekt lokal im selben Render aktualisieren. */
  const [burstSyncedHighlightBezirkId, setBurstSyncedHighlightBezirkId] =
    useState<string | null>(null);
  const [levelMaxMarkerBurstPoints, setLevelMaxMarkerBurstPoints] = useState<
    MapBonusMarkerBurstPoint[]
  >([]);
  const prevDeferredMarkerKeysRef = useRef<
    ReadonlySet<string> | undefined
  >(undefined);
  const lastDistrictHighlightBurstKeyRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const mapSession = useMapSessionOptional();
  const svgMountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [anchors, setAnchors] = useState<DistrictAnchor[]>([]);
  const [districtBounds, setDistrictBounds] = useState<DistrictSvgBounds[]>([]);
  const pendingZoomOutRef = useRef(isMapZoomOutRequest(location.state));
  const mapInitialViewBoxRef = useRef<MapViewBox | undefined>(undefined);
  if (mapInitialViewBoxRef.current === undefined) {
    mapInitialViewBoxRef.current = pendingZoomOutRef.current
      ? (consumeRememberedMapViewBox() ?? INITIAL_MAP_VIEW_BOX)
      : INITIAL_MAP_VIEW_BOX;
  }
  const mapView = useBerlinMapViewBox(canvasRef, {
    initialViewBox: mapInitialViewBoxRef.current,
  });

  useEffect(() => {
    mapView.setViewBoxAttributeSync((attribute) => {
      svgMountRef.current
        ?.querySelector("svg")
        ?.setAttribute("viewBox", attribute);
      markerLayerSvgRef.current?.setAttribute("viewBox", attribute);
      districtLabelsSvgRef.current?.setAttribute("viewBox", attribute);
    });
    return () => mapView.setViewBoxAttributeSync(null);
  }, [mapView.setViewBoxAttributeSync]);

  const districtByBezirkId = useMemo(() => {
    const map = new Map<string, District>();
    for (const d of districts) {
      if (d.bezirkId) {
        map.set(d.bezirkId, d);
      }
    }
    return map;
  }, [districts]);

  const anchorsRef = useLatestRef(anchors);
  const districtBoundsRef = useLatestRef(districtBounds);
  const districtByBezirkIdForBurstRef = useLatestRef(districtByBezirkId);
  const onDistrictHighlightRevealRef = useLatestRef(onDistrictHighlightReveal);

  const effectiveDeferHighlightedBezirkIds = useMemo(() => {
    if (!deferHighlightedBezirkIds?.size) {
      return deferHighlightedBezirkIds;
    }
    if (
      !burstSyncedHighlightBezirkId ||
      !deferHighlightedBezirkIds.has(burstSyncedHighlightBezirkId)
    ) {
      return deferHighlightedBezirkIds;
    }
    const next = new Set(deferHighlightedBezirkIds);
    next.delete(burstSyncedHighlightBezirkId);
    return next.size > 0 ? next : undefined;
  }, [deferHighlightedBezirkIds, burstSyncedHighlightBezirkId]);

  const instantHighlightBezirkIds = useMemo(() => {
    if (!burstSyncedHighlightBezirkId) {
      return undefined;
    }
    return new Set([burstSyncedHighlightBezirkId]);
  }, [burstSyncedHighlightBezirkId]);

  const deferHighlightedBezirkIdsRef = useLatestRef(
    effectiveDeferHighlightedBezirkIds,
  );
  const instantHighlightBezirkIdsRef = useLatestRef(instantHighlightBezirkIds);

  // Bei erneutem Aufschub den vorgezogenen lokalen Farbzustand zurücksetzen.
  useEffect(() => {
    if (!deferHighlightedBezirkIds?.size) {
      return;
    }
    setBurstSyncedHighlightBezirkId((current) =>
      current && deferHighlightedBezirkIds.has(current) ? null : current,
    );
  }, [deferHighlightedBezirkIds]);

  const districtByBezirkIdRef = useLatestRef(districtByBezirkId);
  const navigateRef = useLatestRef(navigate);
  const locationRef = useLatestRef(location);
  const selectedDistrictIdRef = useLatestRef(selectedDistrictId);
  const mapViewRef = useLatestRef(mapView);
  const districtFocusSignatureRef = useRef<string | null>(null);
  const detailZoomDistrictRef = useRef<string | null>(null);
  const levelMarkers: LevelMapMarker[] = useMemo(
    () => buildLevelMapMarkers(districts, anchors, districtBounds),
    [districts, anchors, districtBounds, bonusRevealRevision],
  );

  const boundsByBezirkId = useMemo(
    () => new Map(districtBounds.map((b) => [b.bezirkId, b])),
    [districtBounds],
  );

  const { progressByLevelKey } = useMapPageProgress(districts);

  const markerProgressByLevelKey = useMemo(
    () =>
      mapMarkerProgressForIntroDefer(
        progressByLevelKey,
        deferMarkerSolvedAppearanceLevelKeys,
      ),
    [progressByLevelKey, deferMarkerSolvedAppearanceLevelKeys],
  );

  const endBonusRevealCelebration = useCallback(() => {
    setRevealAnimatingLevelKeys(new Set());
    setMarkerBurstPoints([]);
    onBonusRevealCelebrationEnd?.();
  }, [onBonusRevealCelebrationEnd]);

  const endDistrictHighlightBurst = useCallback(() => {
    setDistrictHighlightBurstPoints([]);
  }, []);

  const endLevelMaxMarkerBurst = useCallback(() => {
    setLevelMaxMarkerBurstPoints([]);
  }, []);

  useEffect(() => {
    if (districtHighlightBurstKey <= 0 || reducedMotion) {
      return;
    }
    if (lastDistrictHighlightBurstKeyRef.current === districtHighlightBurstKey) {
      return;
    }
    const bezirkId = districtHighlightBurstBezirkId?.trim();
    if (!bezirkId) {
      return;
    }

    const spawn = (): boolean => {
      if (lastDistrictHighlightBurstKeyRef.current === districtHighlightBurstKey) {
        return true;
      }
      const mapSvg = svgMountRef.current?.querySelector("svg");
      if (!mapSvg || !(mapSvg instanceof SVGSVGElement)) {
        return false;
      }
      const point = districtHighlightBurstPoint({
        mapSvg,
        markerSvg: markerLayerSvgRef.current,
        bezirkId,
        burstId: districtHighlightBurstKey,
        district: districtByBezirkIdForBurstRef.current.get(bezirkId),
        anchor: anchorsRef.current.find((item) => item.bezirkId === bezirkId),
        bounds: districtBoundsRef.current.find(
          (item) => item.bezirkId === bezirkId,
        ),
      });
      lastDistrictHighlightBurstKeyRef.current = districtHighlightBurstKey;
      // Farbe und Partikel im selben Render aktualisieren, damit beide synchron starten.
      setBurstSyncedHighlightBezirkId(bezirkId);
      if (point) {
        setDistrictHighlightBurstPoints([point]);
      } else {
        setDistrictHighlightBurstPoints([]);
      }
      onDistrictHighlightRevealRef.current?.();
      return true;
    };

    if (spawn()) {
      return;
    }

    const rafId = window.requestAnimationFrame(() => {
      spawn();
    });
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [
    districtHighlightBurstKey,
    districtHighlightBurstBezirkId,
    reducedMotion,
    // Bei noch fehlendem SVG oder Anker erneut versuchen, ohne den Effektschlüssel als erledigt zu markieren.
    anchors.length,
    anchorsRef,
    districtBoundsRef,
    districtByBezirkIdForBurstRef,
    onDistrictHighlightRevealRef,
  ]);

  useEffect(() => {
    const prev = prevDeferredMarkerKeysRef.current;
    const next = deferMarkerSolvedAppearanceLevelKeys;
    prevDeferredMarkerKeysRef.current = next;

    if (reducedMotion) {
      return;
    }

    const revealedKeys = revealedDeferredKeys(prev, next).filter((key) =>
      isMapLevelMaxMarkerProgress(progressByLevelKey.get(key)),
    );
    if (revealedKeys.length === 0) {
      return;
    }

    const svg = markerLayerSvgRef.current;
    const burstKey = Date.now();
    if (svg) {
      const fromDom = readMapMarkerBurstPointsFromDom(
        svg,
        new Set(revealedKeys),
        burstKey,
      );
      if (fromDom.length > 0) {
        setLevelMaxMarkerBurstPoints(fromDom);
        return;
      }
    }

    const mapSvg = svgMountRef.current?.querySelector("svg");
    if (!mapSvg || !(mapSvg instanceof SVGSVGElement)) {
      return;
    }
    const revealedKeySet = new Set(revealedKeys);
    const points: MapBonusMarkerBurstPoint[] = [];
    levelMarkers.forEach((marker, index) => {
      const key = levelProgressKey(marker.level);
      if (!revealedKeySet.has(key)) {
        return;
      }
      const client = clientPointFromMapSvg(mapSvg, marker.x, marker.y);
      points.push({
        id: burstKey + index,
        x: client.x,
        y: client.y,
      });
    });
    if (points.length > 0) {
      setLevelMaxMarkerBurstPoints(points);
    }
  }, [
    deferMarkerSolvedAppearanceLevelKeys,
    reducedMotion,
    progressByLevelKey,
    levelMarkers,
  ]);

  useEffect(() => {
    if (!bonusRevealCelebration) {
      return;
    }

    const district = findDistrictByRouteParam(
      districts,
      bonusRevealCelebration.districtRouteId,
    );
    if (!district) {
      endBonusRevealCelebration();
      return;
    }

    const bonusKeys = new Set(
      getBonusLevels(district).map((level) => levelProgressKey(level)),
    );
    setRevealAnimatingLevelKeys(bonusKeys);

    const revealAnimTimer = window.setTimeout(() => {
      setRevealAnimatingLevelKeys(new Set());
    }, 900);

    const celebrationEndTimer = window.setTimeout(() => {
      endBonusRevealCelebration();
    }, 3200);

    const spawnBursts = () => {
      const routeId = bonusRevealCelebration.districtRouteId;
      onCommitBonusLevelsRevealed?.(routeId);

      const runBurst = () => {
        const svg = markerLayerSvgRef.current;
        if (!svg) {
          return;
        }
        if (reducedMotion) {
          return;
        }

        const bonusKeys = new Set(
          getBonusLevels(district).map((level) => levelProgressKey(level)),
        );
        const domPoints = readMapMarkerBurstPointsFromDom(
          svg,
          bonusKeys,
          bonusRevealCelebration.key,
        );
        if (domPoints.length > 0) {
          setMarkerBurstPoints(domPoints);
          return;
        }

        const bonusMarkers = buildLevelMapMarkers(
          districts,
          anchors,
          districtBounds,
        ).filter(
          (marker) =>
            districtRouteId(marker.district) === routeId &&
            marker.level.primaryLevel === false,
        );

        const points: MapBonusMarkerBurstPoint[] = bonusMarkers.map(
          (marker, index) => {
            const client = clientPointFromMapSvg(svg, marker.x, marker.y);
            return {
              id: bonusRevealCelebration.key + index,
              x: client.x,
              y: client.y,
            };
          },
        );
        setMarkerBurstPoints(points);
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(runBurst);
      });
    };

    const spawnDelayId = window.setTimeout(spawnBursts, 160);

    return () => {
      window.clearTimeout(revealAnimTimer);
      window.clearTimeout(celebrationEndTimer);
      window.clearTimeout(spawnDelayId);
    };
  }, [
    bonusRevealCelebration,
    bonusRevealRevision,
    districts,
    anchors,
    districtBounds,
    reducedMotion,
    endBonusRevealCelebration,
    onCommitBonusLevelsRevealed,
  ]);

  useEffect(() => {
    const host = svgMountRef.current;
    if (!host) {
      return;
    }

    const svg = parsePreparedBerlinMapSvg(berlinMapSvg);
    if (!svg) {
      return;
    }

    svg.setAttribute(
      "class",
      "block h-full w-full touch-none [shape-rendering:geometricPrecision] [text-rendering:geometricPrecision]",
    );
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Karte Berlin mit Bezirken");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("viewBox", viewBoxToAttribute(INITIAL_MAP_VIEW_BOX));

    host.replaceChildren(svg);
    applyBerlinMapDistrictPathStyles(svg, districtByBezirkIdRef.current, {
      deferHighlightedBezirkIds: deferHighlightedBezirkIdsRef.current,
      instantHighlightBezirkIds: instantHighlightBezirkIdsRef.current,
    });
    setAnchors(readDistrictAnchorsFromSvg(svg));
    setDistrictBounds(readDistrictBoundsFromSvg(svg));

    const paths = svg.querySelectorAll<SVGPathElement>(
      BERLIN_MAP_DISTRICT_PATH_SELECTOR,
    );
    const cleanups: (() => void)[] = [];

    paths.forEach((path) => {
      const bezirkId = path.getAttribute("data-bezirk")?.trim();
      if (!bezirkId) {
        return;
      }

      const onClick = () => {
        if (mapViewRef.current.dragMovedRef.current) {
          mapViewRef.current.dragMovedRef.current = false;
          return;
        }
        const district = districtByBezirkIdRef.current.get(bezirkId);
        if (!district) {
          return;
        }
        const routeId = districtRouteId(district);
        const loc = locationRef.current;
        const detailActive =
          isMapDistrictDetailPathname(loc.pathname) ||
          getRouteLevelStartKey(loc.state) != null;
        if (selectedDistrictIdRef.current === routeId && detailActive) {
          return;
        }
        const visibleLevels = district.levels.filter((level) =>
          isLevelVisibleOnMap(district, level),
        );
        const defaultLevelKey = defaultMapSelectedLevelKey(visibleLevels);
        const defaultLevel = defaultLevelKey
          ? visibleLevels.find(
              (level) => levelProgressKey(level) === defaultLevelKey,
            )
          : null;
        navigateRef.current(
          mapDistrictDetailLocation(routeId, {
            detail: true,
            levelKey: defaultLevel
              ? levelRouteSlug(defaultLevel)
              : defaultLevelKey,
          }),
          withViewTransition({
            state: defaultLevelKey
              ? { levelStartKey: defaultLevelKey }
              : undefined,
          }),
        );
      };

      path.addEventListener("click", onClick);
      cleanups.push(() => {
        path.removeEventListener("click", onClick);
      });
    });

    return () => {
      cleanups.forEach((fn) => fn());
      host.replaceChildren();
    };
  }, [
    deferHighlightedBezirkIdsRef,
    districtByBezirkIdRef,
    locationRef,
    mapViewRef,
    navigateRef,
    selectedDistrictIdRef,
  ]);

  useLayoutEffect(() => {
    const svg = svgMountRef.current?.querySelector("svg");
    if (!svg) {
      return;
    }
    svg.setAttribute("viewBox", mapView.viewBoxAttribute);
  }, [mapView.viewBoxAttribute]);

  useEffect(() => {
    rememberMapViewBox(mapView.viewBox);
  }, [mapView.viewBox]);

  useEffect(() => {
    onViewBoxChange?.(mapView.viewBox);
  }, [mapView.viewBox, onViewBoxChange]);

  useEffect(() => {
    if (!pendingZoomOutRef.current || selectedDistrictId) {
      return;
    }
    const svg = svgMountRef.current?.querySelector("svg");
    if (!svg) {
      return;
    }

    const atOverview =
      mapView.viewBox.width >= INITIAL_MAP_VIEW_BOX.width - 0.5;
    if (atOverview) {
      const routeId = getMapZoomOutDistrictRoute(location.state);
      const district = routeId
        ? findDistrictByRouteParam(districts, routeId)
        : undefined;
      const bezirkId = district?.bezirkId?.trim();
      const bbox = bezirkId ? unionDistrictPathBBox(svg, bezirkId) : null;
      if (bbox) {
        mapView.applyViewBoxImmediate(viewBoxForSvgBBox(bbox));
      }
    }

    mapView.resetView();
    pendingZoomOutRef.current = false;
    navigate(
      location.pathname,
      withViewTransition({ replace: true, state: null }),
    );
  }, [
    selectedDistrictId,
    districts,
    anchors.length,
    location.pathname,
    location.state,
    mapView.viewBox.width,
    mapView.applyViewBoxImmediate,
    mapView.resetView,
    navigate,
  ]);

  useLayoutEffect(() => {
    const svg = svgMountRef.current?.querySelector("svg");
    if (!svg || !(svg instanceof SVGSVGElement)) {
      return;
    }
    applyBerlinMapDistrictPathStyles(svg, districtByBezirkId, {
      deferHighlightedBezirkIds: effectiveDeferHighlightedBezirkIds,
      instantHighlightBezirkIds,
    });
  }, [
    districtByBezirkId,
    progressByLevelKey,
    selectedDistrictId,
    effectiveDeferHighlightedBezirkIds,
    instantHighlightBezirkIds,
  ]);

  useEffect(() => {
    districtFocusSignatureRef.current = null;
    detailZoomDistrictRef.current = null;
  }, [selectedDistrictId]);

  useEffect(() => {
    if (!selectedDistrictId) {
      if (pendingZoomOutRef.current) {
        return;
      }
      districtFocusSignatureRef.current = null;
      detailZoomDistrictRef.current = null;
      mapView.resetView();
      return;
    }
    const mapIntroActive = isMapPostLevelMapIntroActive({
      pathname: location.pathname,
      state: location.state,
      districtRouteId: selectedDistrictId ?? null,
    });
    if (mapIntroActive) {
      const signature = districtFocusSignature(selectedDistrictId, "map-intro");
      if (districtFocusSignatureRef.current === signature) {
        return;
      }
      districtFocusSignatureRef.current = signature;
      detailZoomDistrictRef.current = null;
      mapView.resetView();
      return;
    }

    const district = findDistrictByRouteParam(districts, selectedDistrictId);
    const bezirkId = district?.bezirkId?.trim();
    if (!bezirkId) {
      return;
    }
    const svg = svgMountRef.current?.querySelector("svg");
    const bbox = svg ? unionDistrictPathBBox(svg, bezirkId) : null;
    if (!bbox) {
      return;
    }

    const detailMode =
      isMapDistrictDetailPathname(location.pathname) ||
      getRouteLevelStartKey(location.state) != null;
    const mode = detailMode ? "detail" : "overview";
    const signature = districtFocusSignature(selectedDistrictId, mode);
    if (districtFocusSignatureRef.current === signature) {
      return;
    }
    if (
      mode === "detail" &&
      detailZoomDistrictRef.current === selectedDistrictId
    ) {
      districtFocusSignatureRef.current = signature;
      return;
    }
    districtFocusSignatureRef.current = signature;

    if (mode === "overview") {
      detailZoomDistrictRef.current = null;
      mapView.focusOnSvgBBox(bbox);
      return;
    }
    detailZoomDistrictRef.current = selectedDistrictId;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      mapView.focusOnSvgBBox(bbox);
      return;
    }
    mapView.focusOnSvgBBox(
      bbox,
      mapDetailDistrictFocusAlign(
        rect,
        mapDetailSheetTopForFocus(mapSession?.mapDetailPeekTopPx),
      ),
    );
  }, [
    selectedDistrictId,
    districts,
    anchors.length,
    location.pathname,
    location.state,
    mapView.focusOnSvgBBox,
    mapView.resetView,
  ]);

  const districtNameByBezirkId = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of districts) {
      if (d.bezirkId) {
        map.set(d.bezirkId, d.name);
      }
    }
    return map;
  }, [districts]);

  const districtNameOffsetByBezirkId = useMemo(() => {
    const map = new Map<string, DistrictLevelMapMarkerPosition>();
    for (const d of districts) {
      if (!d.bezirkId) {
        continue;
      }
      if (d.namensOffset) {
        map.set(d.bezirkId, d.namensOffset);
      }
    }
    return map;
  }, [districts]);

  const contentOpacity = mapPageContentOpacity(mapView.viewBox.width);
  const districtLabelsOpacity = mapDistrictLabelsOpacity(mapView.viewBox.width);
  const districtLabelsShown = districtLabelsOpacity >= 0.04;

  const visibleDistrictLabels = useMemo(() => {
    if (!districtLabelsShown) {
      return [];
    }
    return buildVisibleDistrictLabels(
      districtBounds,
      districtNameByBezirkId,
      mapView.viewBox,
      districtNameOffsetByBezirkId,
    );
  }, [
    districtBounds,
    districtNameByBezirkId,
    districtNameOffsetByBezirkId,
    mapView.viewBox,
    districtLabelsShown,
  ]);

  const atFullMapOverview =
    !selectedDistrictId &&
    mapView.viewBox.width >= MAP_OVERVIEW_VIEWBOX_WIDTH;
  const markersShown =
    Boolean(selectedDistrictId) ||
    contentOpacity >= 0.04 ||
    mapView.viewBox.width < MAP_OVERVIEW_VIEWBOX_WIDTH;
  const markerOpacity = markersShown ? 1 : 0;
  const markerInteractionMode: "overview" | "level" =
    selectedDistrictId || mapView.viewBox.width < MAP_OVERVIEW_VIEWBOX_WIDTH
      ? "level"
      : "overview";

  const visibleMarkers = useMemo(() => {
    if (!markersShown) {
      return [];
    }
    const visibleOnMap = (m: LevelMapMarker) =>
      isLevelVisibleOnMap(m.district, m.level);
    if (atFullMapOverview) {
      return levelMarkers.filter(visibleOnMap);
    }

    const { viewBox } = mapView;
    return levelMarkers.filter(
      (m) =>
        visibleOnMap(m) &&
        markerVisibleInView(m, viewBox, boundsByBezirkId, selectedDistrictId),
    );
  }, [
    levelMarkers,
    markersShown,
    atFullMapOverview,
    mapView.viewBox,
    boundsByBezirkId,
    selectedDistrictId,
  ]);

  const openOverviewMarker = useCallback(
    (marker: MapMarkerLayerMarker, levelStartKey: string) => {
      const routeId = districtRouteId(marker.district);
      navigate(
        mapDistrictDetailLocation(routeId, {
          detail: true,
          levelKey: levelRouteSlug(marker.level),
        }),
        withViewTransition({
          state: { levelStartKey },
        }),
      );
    },
    [navigate],
  );

  const openLevelMarker = useCallback(
    (marker: MapMarkerLayerMarker, markerLevelKey: string) => {
      const markerDistrictRoute = districtRouteId(marker.district);
      if (selectedDistrictId === markerDistrictRoute) {
        mapSession?.openLevelStartForLevel(markerLevelKey);
        return;
      }
      navigate(
        mapDistrictDetailLocation(markerDistrictRoute, {
          detail: true,
          levelKey: levelRouteSlug(marker.level),
        }),
        withViewTransition({
          state: { levelStartKey: markerLevelKey },
        }),
      );
    },
    [mapSession, navigate, selectedDistrictId],
  );

  const onMarkerAction =
    markerInteractionMode === "overview"
      ? openOverviewMarker
      : openLevelMarker;

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={mapView.viewportRef}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden bg-swg-bg active:cursor-grabbing"
        onPointerDownCapture={mapView.onPointerDownCapture}
        onPointerDown={mapView.onPointerDown}
        onPointerMove={mapView.onPointerMove}
        onPointerUp={mapView.onPointerUp}
        onPointerCancel={mapView.onPointerCancel}
      >
        <div ref={canvasRef} className="absolute inset-0 touch-none">
          <div
            ref={svgMountRef}
            className="absolute inset-0 h-full w-full leading-none"
          />
          <MapDistrictLabelsLayer
            svgRef={districtLabelsSvgRef}
            className="pointer-events-none absolute inset-0 z-[1] block h-full w-full overflow-visible"
            style={{ opacity: districtLabelsOpacity }}
            viewBox={mapView.viewBoxAttribute}
            ariaHidden={!districtLabelsShown}
            labels={visibleDistrictLabels}
          />
          <MapMarkerLayer
            svgRef={markerLayerSvgRef}
            className="pointer-events-none absolute inset-0 z-[2] block h-full w-full overflow-visible"
            style={{ opacity: markerOpacity }}
            viewBox={mapView.viewBoxAttribute}
            ariaHidden={!markersShown}
            mode={markerInteractionMode}
            markers={visibleMarkers}
            progressByLevelKey={markerProgressByLevelKey}
            revealAnimatingLevelKeys={revealAnimatingLevelKeys}
            dragMovedRef={mapView.dragMovedRef}
            onMarkerAction={onMarkerAction}
          />
          <MapBonusMarkerRevealParticles
            points={markerBurstPoints}
            reducedMotion={reducedMotion}
            onAllComplete={endBonusRevealCelebration}
          />
          <MapBonusMarkerRevealParticles
            points={districtHighlightBurstPoints}
            reducedMotion={reducedMotion}
            onAllComplete={endDistrictHighlightBurst}
          />
          <MapBonusMarkerRevealParticles
            points={levelMaxMarkerBurstPoints}
            reducedMotion={reducedMotion}
            onAllComplete={endLevelMaxMarkerBurst}
          />
        </div>
      </div>
    </div>
  );
}
