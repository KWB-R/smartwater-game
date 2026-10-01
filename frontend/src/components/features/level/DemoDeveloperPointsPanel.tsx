import { useMemo } from "react";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { GoalFocusDimension, Level, PointMatrix } from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import { cn } from "@/lib/cn";
import { maxPlacementWeightedScore } from "@/features/level/logic/calculateMaxPuzzleScore";
import {
  BASE_POINTS_WEIGHT,
  BONUS_POINTS_WEIGHT,
  MISSION_POINTS_WEIGHT,
} from "@/features/level/logic/scoringConstants";
import { DIMENSION_LABEL_DE } from "@/features/level/logic/placementRewardSteps";
import {
  isPlacementPassed,
  levelPassThresholdScore,
  scoreFromAccumulatedPointMatrix,
  sumMissionCategoryPointsFromPlaced,
  sumPlacedTilesScoreBreakdown,
  tilePlacementScoreBreakdown,
} from "@/features/level/logic/placementScoring";
import { activeMissionCategoryIds } from "@/features/level/logic/tileCategoryPoints";
import {
  getLevelBonusCategoryMeta,
  TILE_DETAIL_CATEGORY_ORDER,
  type LevelBonusCategoryId,
} from "@/domain/levelBonusCategories";

const MISSION_DIMENSION_ORDER: GoalFocusDimension[] = [
  "cooling",
  "flooding",
  "water",
  "biodiversity",
  "quality",
];

export type DemoDeveloperPointsPanelProps = {
  level: Level;
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  /** Bisherige Missionspunkte aus den Platzierungen. */
  placementMatrix: PointMatrix;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  placedTiles: PlacedTile[];
  currentMaxTileCount: number;
  barDisplayScore: number;
  barMaxScore: number;
  quizMatrix?: PointMatrix | null;
};

function matrixDimensionRows(
  matrix: PointMatrix,
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>,
): { key: string; label: string; value: number }[] {
  const rows: { key: string; label: string; value: number }[] = [
    { key: "default", label: "Allgemein (default)", value: matrix.default },
  ];
  for (const dim of MISSION_DIMENSION_ORDER) {
    if (!missionGoalDimensions.has(dim)) {
      continue;
    }
    rows.push({
      key: dim,
      label: DIMENSION_LABEL_DE[dim],
      value: matrix[dim],
    });
  }
  return rows;
}

type MatrixBreakdownProps = {
  title: string;
  matrix: PointMatrix;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  missionOnlySum: number;
  includeDefaultSum: number;
};

function MatrixBreakdown({
  title,
  matrix,
  missionGoalDimensions,
  missionOnlySum,
  includeDefaultSum,
}: MatrixBreakdownProps) {
  const rows = useMemo(
    () => matrixDimensionRows(matrix, missionGoalDimensions),
    [matrix, missionGoalDimensions],
  );

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-3">
      <h3 className="m-0 mb-2 text-[0.6875rem] font-semibold tracking-wide text-neutral-600 uppercase">
        {title}
      </h3>
      {rows.length > 0 ? (
        <table className="w-full border-collapse text-[0.75rem] [&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-2 [&_td]:py-1 [&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_th]:text-neutral-600">
          <thead>
            <tr>
              <th>Dimension</th>
              <th className="text-right">Matrix-Wert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td className="text-right tabular-nums">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="m-0 text-[0.75rem] text-neutral-600">
          Keine Missions-Dimensionen aktiv — Matrix enthält nur ggf.{" "}
          <code className="text-[0.7rem]">default</code>.
        </p>
      )}
      <dl className="mt-2 mb-0 grid gap-1 text-[0.75rem] text-neutral-800">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-600">Σ nur Missions-Dims.</dt>
          <dd className="m-0 font-medium tabular-nums">{missionOnlySum}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-600">Σ inkl. default (Balken-Logik)</dt>
          <dd className="m-0 font-medium tabular-nums">{includeDefaultSum}</dd>
        </div>
      </dl>
    </section>
  );
}

export function DemoDeveloperPointsPanel({
  level,
  puzzleItems,
  placementMatrix,
  missionGoalDimensions,
  placedTiles,
  currentMaxTileCount,
  barDisplayScore,
  barMaxScore,
  quizMatrix = null,
}: DemoDeveloperPointsPanelProps) {
  const placementBreakdown = useMemo(
    () => sumPlacedTilesScoreBreakdown(placedTiles, puzzleItems, level),
    [placedTiles, puzzleItems, level],
  );
  const placementScore = placementBreakdown.total;

  const missionCategoryTotals = useMemo(
    () => sumMissionCategoryPointsFromPlaced(placedTiles, puzzleItems, level),
    [placedTiles, puzzleItems, level],
  );

  const activeMissionIds = useMemo(
    () => activeMissionCategoryIds(puzzleItems, level),
    [puzzleItems, level],
  );

  const missionCategoryRows = useMemo(() => {
    const rows: { id: LevelBonusCategoryId; label: string; raw: number }[] = [];
    for (const id of TILE_DETAIL_CATEGORY_ORDER) {
      if (!activeMissionIds.has(id)) {
        continue;
      }
      const raw = missionCategoryTotals.get(id) ?? 0;
      rows.push({ id, label: getLevelBonusCategoryMeta(id).label, raw });
    }
    return rows;
  }, [activeMissionIds, missionCategoryTotals]);

  const placementMatrixMissionOnly = useMemo(
    () =>
      scoreFromAccumulatedPointMatrix(placementMatrix, missionGoalDimensions, {
        includeDefault: false,
      }),
    [placementMatrix, missionGoalDimensions],
  );

  const placementMatrixWithDefault = useMemo(
    () =>
      scoreFromAccumulatedPointMatrix(placementMatrix, missionGoalDimensions, {
        includeDefault: true,
      }),
    [placementMatrix, missionGoalDimensions],
  );

  const quizScore =
    quizMatrix != null
      ? scoreFromAccumulatedPointMatrix(quizMatrix, missionGoalDimensions, {
          includeDefault: false,
        })
      : null;

  const quizMatrixWithDefault =
    quizMatrix != null
      ? scoreFromAccumulatedPointMatrix(quizMatrix, missionGoalDimensions, {
          includeDefault: true,
        })
      : null;

  const totalScore =
    quizScore != null ? placementScore + quizScore : null;

  const expectedBarScore =
    totalScore != null ? totalScore : placementScore;

  const thresholds = useMemo(() => {
    const maxItems = currentMaxTileCount;
    const weighted = maxPlacementWeightedScore(
      puzzleItems,
      level,
      maxItems,
    );
    return { withoutExtraSlot: weighted, withExtraSlot: weighted };
  }, [level, puzzleItems, currentMaxTileCount]);
  const minPass = levelPassThresholdScore(level, missionGoalDimensions);
  const barMismatch =
    Math.round(barDisplayScore) !== Math.round(expectedBarScore);
  const matrixMismatch =
    Math.round(placementMatrixMissionOnly) !==
    Math.round(placementBreakdown.missionPoints);

  const passedTotal =
    totalScore != null
      ? isPlacementPassed(
          placementScore,
          quizScore ?? 0,
          level,
          missionGoalDimensions,
        )
      : null;
  const passedPlacementOnly = placementScore >= minPass;

  const activeDimensionLabels = useMemo(
    () =>
      MISSION_DIMENSION_ORDER.filter((d) => missionGoalDimensions.has(d)).map(
        (d) => DIMENSION_LABEL_DE[d],
      ),
    [missionGoalDimensions],
  );

  const shell =
    "fixed inset-x-0 bottom-0 z-[300] m-0 w-full border-t border-neutral-300 bg-neutral-50 text-xs leading-snug text-neutral-900 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] [font-variant-numeric:tabular-nums]";
  const summary =
    "border-b border-neutral-200 bg-white px-3 py-2 cursor-pointer list-none font-semibold text-neutral-800 [&::-webkit-details-marker]:hidden before:text-neutral-500 before:content-['▸_'] open:before:content-['▾_']";

  return (
    <details className={shell}>
      <summary className={summary}>
        <span className="ml-1">Dev — Punkteauswertung</span>
        <span className="ml-2 font-normal text-neutral-600">
          {quizScore != null
            ? `Platzierung ${placementScore} + Quiz ${quizScore} = ${totalScore}`
            : `Platzierung ${placementScore}`}
          {" · "}
          Balken {barDisplayScore}/{barMaxScore}
        </span>
      </summary>
      <div className="max-h-[min(58vh,32rem)] overflow-auto px-3 py-3">
        <p className="m-0 mb-3 max-w-3xl text-[0.75rem] text-neutral-700">
          Die Spielwertung: Basis ×{BASE_POINTS_WEIGHT}, Bonus ×
          {BONUS_POINTS_WEIGHT}, Mission ×{MISSION_POINTS_WEIGHT}. Der
          Header-Balken nutzt die kumulierte Matrix inkl.{" "}
          <code className="rounded bg-neutral-100 px-1 text-[0.7rem]">default</code>
          ; die Dev-Matrix „nur Missions-Dims.“ entspricht der Summe der
          Kategorie-Tabelle unten.
        </p>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-md border border-neutral-200 bg-white p-3 lg:col-span-1">
            <p className="m-0 text-[0.6875rem] font-semibold tracking-wide text-neutral-500 uppercase">
              Platzierungs-Score
            </p>
            <p className="mt-1 mb-0 text-2xl font-semibold text-neutral-900">
              {placementScore}
            </p>
            <p className="mt-2 mb-0 text-[0.75rem] text-neutral-700">
              {placementBreakdown.basePoints} Basis
              {" + "}
              {placementBreakdown.missionPoints} Missions
              {" + "}
              {placementBreakdown.bonusPoints} Bonus
            </p>
          </div>

          {quizScore != null && (
            <div className="rounded-md border border-neutral-200 bg-white p-3 lg:col-span-1">
              <p className="m-0 text-[0.6875rem] font-semibold tracking-wide text-neutral-500 uppercase">
                Quiz-Score
              </p>
              <p className="mt-1 mb-0 text-2xl font-semibold text-neutral-900">
                {quizScore}
              </p>
              <p className="mt-2 mb-0 text-[0.75rem] text-neutral-700">
                Aus Quiz-Matrix (nur Missions-Dims.)
              </p>
            </div>
          )}

          <div
            className={cn(
              "rounded-md border border-neutral-200 bg-white p-3",
              quizScore != null ? "lg:col-span-1" : "lg:col-span-2",
            )}
          >
            <p className="m-0 text-[0.6875rem] font-semibold tracking-wide text-neutral-500 uppercase">
              {quizScore != null ? "Gesamt & Bestanden" : "Schwellen"}
            </p>
            {quizScore != null && totalScore != null ? (
              <>
                <p className="mt-1 mb-0 text-2xl font-semibold text-neutral-900">
                  {totalScore}
                </p>
                <p className="mt-2 mb-0 text-[0.75rem] text-neutral-700">
                  Level bestanden (Platzierung + Quiz ≥ {minPass}):{" "}
                  <strong>{passedTotal ? "ja" : "nein"}</strong>
                  <br />
                  Nur Platzierung ≥ {minPass}:{" "}
                  <strong>{passedPlacementOnly ? "ja" : "nein"}</strong>
                </p>
              </>
            ) : (
              <p className="mt-2 mb-0 text-[0.75rem] text-neutral-700">
                Min. zum Bestehen: <strong>{minPass}</strong>
                <br />
                Nur Platzierung ≥ Min.:{" "}
                <strong>{passedPlacementOnly ? "ja" : "nein"}</strong>
              </p>
            )}
          </div>
        </div>

        {(barMismatch || matrixMismatch) && (
          <ul className="mt-3 mb-0 list-none rounded-md border border-amber-200 bg-amber-50 p-2 text-[0.75rem] text-amber-950">
            {matrixMismatch && (
              <li>
                Matrix (Missions-Dims.) {placementMatrixMissionOnly} weicht von
                Kategorie-Summe {placementBreakdown.missionPoints} ab — Session
                oder Tiles prüfen.
              </li>
            )}
            {barMismatch && (
              <li className={matrixMismatch ? "mt-1" : undefined}>
                Balken zeigt {barDisplayScore}, erwartet{" "}
                {expectedBarScore}
                {quizScore != null
                  ? " (Platzierung + Quiz)"
                  : " (nur Platzierung)"}
                .
              </li>
            )}
          </ul>
        )}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <section className="rounded-md border border-neutral-200 bg-white p-3">
            <h3 className="m-0 mb-2 text-[0.6875rem] font-semibold tracking-wide text-neutral-600 uppercase">
              Missions-Kategorien (Platzierung)
            </h3>
            {missionCategoryRows.length > 0 ? (
              <table className="w-full border-collapse text-[0.75rem] [&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-2 [&_td]:py-1 [&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_th]:text-neutral-600">
                <thead>
                  <tr>
                    <th>Kategorie</th>
                    <th className="text-right">Pkt.</th>
                  </tr>
                </thead>
                <tbody>
                  {missionCategoryRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.label}</td>
                      <td className="text-right">{r.raw}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="border-t border-neutral-200 pt-1 font-medium">
                      Summe
                    </td>
                    <td className="border-t border-neutral-200 pt-1 text-right font-medium">
                      {placementBreakdown.missionPoints}
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="m-0 text-[0.75rem] text-neutral-600">
                Keine aktiven Missions-Kategorien (CMS / Level-Fokus).
              </p>
            )}
            <p className="mt-2 mb-0 text-[0.75rem] text-neutral-600">
              Aktive Matrix-Dimensionen:{" "}
              {activeDimensionLabels.length > 0
                ? activeDimensionLabels.join(", ")
                : "—"}
            </p>
          </section>

          <section className="rounded-md border border-neutral-200 bg-white p-3">
            <h3 className="m-0 mb-2 text-[0.6875rem] font-semibold tracking-wide text-neutral-600 uppercase">
              Schwellen & Balken
            </h3>
            <ul className="m-0 grid gap-1.5 pl-0 text-[0.75rem] text-neutral-800 [&_li]:list-none">
              <li className="flex justify-between gap-2">
                <span className="text-neutral-600">Voll-Score ohne Extra-Slot</span>
                <span className="font-medium">{thresholds.withoutExtraSlot}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-neutral-600">Voll-Score mit Extra-Slot</span>
                <span className="font-medium">{thresholds.withExtraSlot}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-neutral-600">Balken-Maximum (aktuell)</span>
                <span className="font-medium">{barMaxScore}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-neutral-600">Belegte Slots</span>
                <span className="font-medium">
                  {placedTiles.length} / {currentMaxTileCount} (Level-Max{" "}
                  {level.maximumTileCount}
                  {currentMaxTileCount > level.maximumTileCount
                    ? ", Extra-Slot"
                    : ""}
                  )
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-neutral-600">Min. zum Bestehen</span>
                <span className="font-medium">{minPass}</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <MatrixBreakdown
            title="Kumulierte Matrix — Platzierung"
            matrix={placementMatrix}
            missionGoalDimensions={missionGoalDimensions}
            missionOnlySum={placementMatrixMissionOnly}
            includeDefaultSum={placementMatrixWithDefault}
          />
          {quizMatrix != null && quizMatrixWithDefault != null && quizScore != null && (
            <MatrixBreakdown
              title="Kumulierte Matrix — Quiz"
              matrix={quizMatrix}
              missionGoalDimensions={missionGoalDimensions}
              missionOnlySum={quizScore}
              includeDefaultSum={quizMatrixWithDefault}
            />
          )}
        </div>

        <section className="mt-3 rounded-md border border-neutral-200 bg-white p-3">
          <h3 className="m-0 mb-2 text-[0.6875rem] font-semibold tracking-wide text-neutral-600 uppercase">
            Pro platziertes Tile
          </h3>
          {placedTiles.length > 0 ? (
            <table className="w-full border-collapse text-[0.75rem] [&_td]:border-b [&_td]:border-neutral-100 [&_td]:px-2 [&_td]:py-1 [&_th]:border-b [&_th]:border-neutral-200 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_th]:text-neutral-600">
              <thead>
                <tr>
                  <th>Tile</th>
                  <th className="text-right">Basis</th>
                  <th className="text-right">Mission</th>
                  <th className="text-right">Bonus</th>
                  <th className="text-right">Σ</th>
                </tr>
              </thead>
              <tbody>
                {placedTiles.map((p) => {
                  const b = tilePlacementScoreBreakdown(
                    p.tile,
                    puzzleItems,
                    level,
                  );
                  return (
                    <tr key={p.placementKey}>
                      <td className="font-medium text-neutral-900">
                        {p.tile.name}
                      </td>
                      <td className="text-right">{b.basePoints}</td>
                      <td className="text-right">{b.missionPoints}</td>
                      <td className="text-right">{b.bonusPoints}</td>
                      <td className="text-right font-medium">{b.total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="m-0 text-[0.75rem] text-neutral-600">
              Noch keine Placements.
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
