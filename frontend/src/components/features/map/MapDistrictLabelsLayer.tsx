import type { CSSProperties, Ref } from "react";
import type { DistrictLevelMapMarkerPosition } from "@/types/content";
import type { DistrictSvgBounds } from "@/features/map/berlinMapLayout";
import { resolveDistrictNameLabelPoint } from "@/features/map/berlinMapLayout";
import type { MapViewBox } from "@/features/map/useBerlinMapViewBox";

export type MapDistrictLabel = {
  bezirkId: string;
  name: string;
  lines: string[];
  x: number;
  y: number;
  fontSize: number;
};

type MapDistrictLabelsLayerProps = {
  svgRef: Ref<SVGSVGElement>;
  className?: string;
  style?: CSSProperties;
  viewBox: string;
  preserveAspectRatio?: string;
  ariaHidden: boolean;
  labels: ReadonlyArray<MapDistrictLabel>;
};

/** Lange Komposita an Bindestrich/Leerzeichen umbrechen. */
export function splitDistrictLabelLines(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.includes("-")) {
    const parts = trimmed.split("-").map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 1) {
      return [trimmed];
    }
    return parts.map((part, index) =>
      index < parts.length - 1 ? `${part}-` : part,
    );
  }
  if (/\s/.test(trimmed)) {
    return trimmed.split(/\s+/).filter(Boolean);
  }
  return [trimmed];
}

export function MapDistrictLabelsLayer({
  svgRef,
  className,
  style,
  viewBox,
  preserveAspectRatio = "xMidYMid meet",
  ariaHidden,
  labels,
}: MapDistrictLabelsLayerProps) {
  return (
    <svg
      ref={svgRef}
      className={className}
      style={style}
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden={ariaHidden}
    >
      {labels.map((label) => {
        const lineHeight = label.fontSize * 1.15;
        const firstLineDy = -((label.lines.length - 1) * lineHeight) / 2;
        return (
          <text
            key={label.bezirkId}
            x={label.x}
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={label.fontSize}
            className="pointer-events-none select-none font-text font-medium uppercase fill-swg-black/50"
            paintOrder="stroke"
            stroke="rgb(255 255 255 / 0.85)"
            strokeWidth={Math.max(1.5, label.fontSize * 0.12)}
            strokeLinejoin="round"
          >
            {label.lines.map((line, index) => (
              <tspan
                key={`${label.bezirkId}-${index}`}
                x={label.x}
                dy={index === 0 ? firstLineDy : lineHeight}
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

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

/** Bezirksnamen nur im sichtbaren Bereich und bei ausreichend Platz anzeigen. */
export function buildVisibleDistrictLabels(
  bounds: ReadonlyArray<DistrictSvgBounds>,
  districtNameByBezirkId: ReadonlyMap<string, string>,
  viewBox: MapViewBox,
  nameOffsetByBezirkId?: ReadonlyMap<
    string,
    DistrictLevelMapMarkerPosition
  >,
): MapDistrictLabel[] {
  const minSpan = viewBox.width * 0.055;
  const labels: MapDistrictLabel[] = [];

  for (const districtBounds of bounds) {
    const name = districtNameByBezirkId.get(districtBounds.bezirkId);
    if (!name?.trim()) {
      continue;
    }
    if (!rectsIntersect(districtBounds, viewBox)) {
      continue;
    }
    const span = Math.min(districtBounds.width, districtBounds.height);
    if (span < minSpan) {
      continue;
    }

    const trimmedName = name.trim();
    const fontSize = Math.min(16, Math.max(8, span * 0.14));
    const offset = nameOffsetByBezirkId?.get(districtBounds.bezirkId) ?? null;
    const point = resolveDistrictNameLabelPoint(districtBounds, offset);
    labels.push({
      bezirkId: districtBounds.bezirkId,
      name: trimmedName,
      lines: splitDistrictLabelLines(trimmedName),
      x: point.x,
      y: point.y,
      fontSize,
    });
  }

  return labels;
}
