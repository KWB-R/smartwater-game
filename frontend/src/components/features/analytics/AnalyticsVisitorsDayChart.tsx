import { useMemo } from "react";
import {
  buildAxisTicks,
  niceCeil,
} from "@/features/analytics/chartAxis";

type DayPoint = {
  day: string;
  unique: number;
  sessions: number;
};

type AnalyticsVisitorsDayChartProps = {
  uniqueRows: { day: string; count: number }[];
  sessionRows: { day: string; count: number }[];
};

const VIEW_W = 720;
const VIEW_H = 220;
const PAD = { top: 12, right: 12, bottom: 32, left: 40 };

function formatDayShort(day: string): string {
  const [, m, d] = day.split("-");
  if (!m || !d) return day;
  return `${d}.${m}.`;
}

function buildPoints(
  uniqueRows: { day: string; count: number }[],
  sessionRows: { day: string; count: number }[],
): DayPoint[] {
  const days = new Set<string>();
  for (const row of uniqueRows) days.add(row.day);
  for (const row of sessionRows) days.add(row.day);
  const uniqueMap = new Map(uniqueRows.map((r) => [r.day, r.count]));
  const sessionMap = new Map(sessionRows.map((r) => [r.day, r.count]));
  return [...days]
    .sort((a, b) => a.localeCompare(b))
    .map((day) => ({
      day,
      unique: uniqueMap.get(day) ?? 0,
      sessions: sessionMap.get(day) ?? 0,
    }));
}

function linePath(
  points: DayPoint[],
  valueKey: "unique" | "sessions",
  axisMax: number,
  plotW: number,
  plotH: number,
): string {
  if (points.length === 0) return "";
  const xAt = (index: number) =>
    PAD.left +
    (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const yAt = (value: number) =>
    PAD.top + plotH - (value / axisMax) * plotH;

  return points
    .map((point, index) => {
      const cmd = index === 0 ? "M" : "L";
      return `${cmd}${xAt(index).toFixed(2)},${yAt(point[valueKey]).toFixed(2)}`;
    })
    .join(" ");
}

function xLabelIndices(count: number): number[] {
  if (count <= 1) return [0];
  if (count <= 8) return Array.from({ length: count }, (_, i) => i);
  const maxLabels = 7;
  const step = Math.max(1, Math.ceil((count - 1) / (maxLabels - 1)));
  const indices: number[] = [];
  for (let i = 0; i < count; i += step) {
    indices.push(i);
  }
  if (indices[indices.length - 1] !== count - 1) {
    indices.push(count - 1);
  }
  return indices;
}

export function AnalyticsVisitorsDayChart({
  uniqueRows,
  sessionRows,
}: AnalyticsVisitorsDayChartProps) {
  const points = useMemo(
    () => buildPoints(uniqueRows, sessionRows),
    [uniqueRows, sessionRows],
  );

  const axisMax = useMemo(() => {
    let max = 0;
    for (const point of points) {
      max = Math.max(max, point.unique, point.sessions);
    }
    return niceCeil(max);
  }, [points]);

  const ticks = useMemo(() => buildAxisTicks(axisMax), [axisMax]);

  const plotW = VIEW_W - PAD.left - PAD.right;
  const plotH = VIEW_H - PAD.top - PAD.bottom;

  const uniquePath = useMemo(
    () => linePath(points, "unique", axisMax, plotW, plotH),
    [points, axisMax, plotW, plotH],
  );
  const sessionsPath = useMemo(
    () => linePath(points, "sessions", axisMax, plotW, plotH),
    [points, axisMax, plotW, plotH],
  );

  const xLabels = useMemo(() => xLabelIndices(points.length), [points.length]);

  if (points.length === 0) {
    return null;
  }

  const ariaSummary = points
    .map(
      (p) =>
        `${formatDayShort(p.day)}: ${p.unique} Unique, ${p.sessions} Sessions`,
    )
    .join("; ");

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={`Verlauf Unique Visitors und Sessions: ${ariaSummary}`}
      >
        {ticks.map((tick) => {
          const y = PAD.top + plotH - (tick / axisMax) * plotH;
          return (
            <g key={tick}>
              <line
                x1={PAD.left}
                y1={y}
                x2={VIEW_W - PAD.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-current text-[10px] opacity-60"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={PAD.left}
          y1={PAD.top + plotH}
          x2={VIEW_W - PAD.right}
          y2={PAD.top + plotH}
          stroke="currentColor"
          strokeOpacity={0.2}
        />

        {xLabels.map((index) => {
          const x =
            PAD.left +
            (points.length === 1
              ? plotW / 2
              : (index / (points.length - 1)) * plotW);
          return (
            <text
              key={points[index]?.day ?? index}
              x={x}
              y={VIEW_H - 8}
              textAnchor="middle"
              className="fill-current text-[10px] opacity-70"
            >
              {formatDayShort(points[index]?.day ?? "")}
            </text>
          );
        })}

        <path
          d={sessionsPath}
          fill="none"
          stroke="#4982cf"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={uniquePath}
          fill="none"
          stroke="#375172"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-2 text-base opacity-70">
        <span className="mr-4 inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-swg-blue-dark"
            aria-hidden
          />
          Unique Visitors
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-swg-blue-mid"
            aria-hidden
          />
          Sessions
        </span>
      </p>
    </div>
  );
}
