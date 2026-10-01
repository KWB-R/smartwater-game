import type {
  CSSProperties,
  KeyboardEvent,
  MutableRefObject,
  Ref,
} from "react";
import { BonusLevelMapMarkerGraphic } from "@/internal_assets/map/Bonuslevel";
import { LocationMapMarkerSvg } from "@/internal_assets/map/LocationIcon";
import { LevelMaxMapMarkerSvg } from "@/internal_assets/map/LevelMax";
import {
  isMapLevelMaxMarkerProgress,
  levelProgressKey,
  type LevelProgress,
} from "@/features/level/levelProgress";
import {
  MAP_BONUS_LEVEL_GIFT_MARKER_HEIGHT,
  MAP_BONUS_LEVEL_GIFT_MARKER_WIDTH,
  MAP_LEVEL_MARKER_PIN_HEIGHT,
  MAP_LEVEL_MARKER_PIN_WIDTH,
  MAP_LEVEL_MAX_MARKER_HEIGHT,
  MAP_LEVEL_MAX_MARKER_WIDTH,
} from "@/features/map/berlinMapConstants";
import type {
  DistrictOverviewMarker,
  LevelMapMarker,
} from "@/features/map/berlinMapLayout";

export type MapMarkerLayerMarker = DistrictOverviewMarker | LevelMapMarker;

const MARKER_ICON_WIDTH = MAP_LEVEL_MARKER_PIN_WIDTH;
const MARKER_ICON_HEIGHT = MAP_LEVEL_MARKER_PIN_HEIGHT;
const MAP_MARKER_PIN_FILL = "var(--color-swg-green)";
const MAP_MARKER_PIN_CLASS =
  "map-marker-pin-graphic pointer-events-none drop-shadow-[0_2px_4px_rgb(55_81_114/0.3)] transition-transform duration-150 ease-in-out [transform-box:fill-box] group-hover:scale-110 group-focus-visible:scale-110";
const MAP_BONUS_MARKER_GIFT_CLASS =
  "pointer-events-none transition-transform [transform-box:fill-box] group-hover:scale-110 group-focus-visible:scale-110";

type MapMarkerLayerMode = "overview" | "level";

type MapMarkerLayerProps = {
  svgRef: Ref<SVGSVGElement>;
  className: string;
  style?: CSSProperties;
  viewBox: string;
  preserveAspectRatio?: string;
  ariaHidden: boolean;
  mode: MapMarkerLayerMode;
  markers: ReadonlyArray<MapMarkerLayerMarker>;
  progressByLevelKey: ReadonlyMap<string, LevelProgress | null>;
  revealAnimatingLevelKeys: ReadonlySet<string>;
  dragMovedRef: MutableRefObject<boolean>;
  onMarkerAction: (marker: MapMarkerLayerMarker, levelKey: string) => void;
};

export function MapMarkerLayer({
  svgRef,
  className,
  style,
  viewBox,
  preserveAspectRatio = "xMidYMid meet",
  ariaHidden,
  mode,
  markers,
  progressByLevelKey,
  revealAnimatingLevelKeys,
  dragMovedRef,
  onMarkerAction,
}: MapMarkerLayerProps) {
  return (
    <svg
      ref={svgRef}
      className={className}
      style={style}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden={ariaHidden}
    >
      {markers.map((marker) => {
        const levelKey = levelProgressKey(marker.level);
        return (
          <MapMarkerButton
            key={`${marker.district.id}-${marker.level.id}`}
            marker={marker}
            levelKey={levelKey}
            mode={mode}
            progress={progressByLevelKey.get(levelKey) ?? null}
            revealAnimating={revealAnimatingLevelKeys.has(levelKey)}
            dragMovedRef={dragMovedRef}
            onMarkerAction={onMarkerAction}
          />
        );
      })}
    </svg>
  );
}

type MapMarkerButtonProps = {
  marker: MapMarkerLayerMarker;
  levelKey: string;
  mode: MapMarkerLayerMode;
  progress: LevelProgress | null;
  revealAnimating: boolean;
  dragMovedRef: MutableRefObject<boolean>;
  onMarkerAction: (marker: MapMarkerLayerMarker, levelKey: string) => void;
};

function MapMarkerButton({
  marker,
  levelKey,
  mode,
  progress,
  revealAnimating,
  dragMovedRef,
  onMarkerAction,
}: MapMarkerButtonProps) {
  const label =
    mode === "overview"
      ? `Bezirk ${marker.district.name}`
      : `Level ${marker.level.name} in ${marker.district.name}`;
  const actionLabel = mode === "overview" ? "öffnen" : "Mission starten";
  const isBonusLevel = marker.level.primaryLevel === false;
  const showLevelMax = isMapLevelMaxMarkerProgress(progress);
  const markerMotionClass = revealAnimating
    ? "map-bonus-marker-reveal-enter--pin"
    : "map-marker-pulse-pin";

  const handleAction = () => {
    dragMovedRef.current = false;
    onMarkerAction(marker, levelKey);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    handleAction();
  };

  return (
    <g
      data-berlin-map-marker=""
      data-map-level-key={levelKey}
      className="group pointer-events-auto cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-swg-green-dark"
      transform={`translate(${marker.x} ${marker.y})`}
      role="button"
      tabIndex={0}
      aria-label={`${label} — ${actionLabel}`}
      onPointerDown={(event) => {
        event.stopPropagation();
        dragMovedRef.current = false;
      }}
      onClick={handleAction}
      onKeyDown={handleKeyDown}
    >
      <title>{label}</title>
      <MapMarkerGraphic
        isBonusLevel={isBonusLevel}
        showLevelMax={showLevelMax}
        markerMotionClass={markerMotionClass}
      />
    </g>
  );
}

type MarkerGraphicProps = {
  isBonusLevel: boolean;
  showLevelMax: boolean;
  markerMotionClass: string;
};

function MapMarkerGraphic({
  isBonusLevel,
  showLevelMax,
  markerMotionClass,
}: MarkerGraphicProps) {
  const iconWidth = showLevelMax
    ? MAP_LEVEL_MAX_MARKER_WIDTH
    : MARKER_ICON_WIDTH;
  const iconHeight = showLevelMax
    ? MAP_LEVEL_MAX_MARKER_HEIGHT
    : MARKER_ICON_HEIGHT;
  const pinAnchorX = -iconWidth / 2;
  const pinAnchorY = -iconHeight;

  return (
    <g className={markerMotionClass}>
      <rect
        x={pinAnchorX - 8}
        y={pinAnchorY - 8}
        width={iconWidth + 16}
        height={iconHeight + 16}
        className="fill-transparent [pointer-events:all]"
      />
      {showLevelMax ? (
        <LevelMaxMapMarkerSvg
          x={pinAnchorX}
          y={pinAnchorY}
          width={iconWidth}
          height={iconHeight}
          className={MAP_MARKER_PIN_CLASS}
        />
      ) : isBonusLevel ? (
        <g className={MAP_BONUS_MARKER_GIFT_CLASS}>
          <BonusLevelMapMarkerGraphic
            width={MAP_BONUS_LEVEL_GIFT_MARKER_WIDTH}
            height={MAP_BONUS_LEVEL_GIFT_MARKER_HEIGHT}
          />
        </g>
      ) : (
        <LocationMapMarkerSvg
          x={pinAnchorX}
          y={pinAnchorY}
          width={iconWidth}
          height={iconHeight}
          className={MAP_MARKER_PIN_CLASS}
          pinFill={MAP_MARKER_PIN_FILL}
        />
      )}
    </g>
  );
}
