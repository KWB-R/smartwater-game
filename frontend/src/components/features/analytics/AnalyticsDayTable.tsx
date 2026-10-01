import { formatDay } from "@/features/analytics/dateRangePresets";
import { useMemo } from "react";
import { AnalyticsCollapsibleSection } from "@/components/features/analytics/AnalyticsCollapsibleSection";
import { AnalyticsVisitorsDayChart } from "@/components/features/analytics/AnalyticsVisitorsDayChart";

type AnalyticsDayTableProps = {
  uniqueRows: { day: string; count: number }[];
  sessionRows: { day: string; count: number }[];
  allCompleteRows: { day: string; count: number }[];
  daysTotal: number;
  hasMore: boolean;
  loadingMore?: boolean;
  stickyTop?: number;
  onLoadMore?: () => void;
};

export function AnalyticsDayTable({
  uniqueRows,
  sessionRows,
  allCompleteRows,
  daysTotal,
  hasMore,
  loadingMore,
  stickyTop,
  onLoadMore,
}: AnalyticsDayTableProps) {
  const days = useMemo(() => {
    const set = new Set<string>();
    for (const row of uniqueRows) set.add(row.day);
    for (const row of sessionRows) set.add(row.day);
    for (const row of allCompleteRows) set.add(row.day);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [uniqueRows, sessionRows, allCompleteRows]);

  const uniqueMap = useMemo(
    () => new Map(uniqueRows.map((r) => [r.day, r.count])),
    [uniqueRows],
  );
  const sessionMap = useMemo(
    () => new Map(sessionRows.map((r) => [r.day, r.count])),
    [sessionRows],
  );
  const allCompleteMap = useMemo(
    () => new Map(allCompleteRows.map((r) => [r.day, r.count])),
    [allCompleteRows],
  );

  const shownLabel = useMemo(() => {
    const loaded = days.length;
    const total = Math.max(daysTotal, loaded);
    if (loaded === 0) return "0 Tage";
    if (loaded === total) {
      return `${loaded} Tag${loaded === 1 ? "" : "e"}`;
    }
    return `${loaded} von ${total} Tag${total === 1 ? "" : "en"}`;
  }, [days.length, daysTotal]);

  return (
    <AnalyticsCollapsibleSection
      title="Besucher / Tag"
      meta={shownLabel}
      stickyTop={stickyTop}
    >
      {days.length === 0 ? (
        <p className="mt-2 text-base opacity-70">Noch keine Daten.</p>
      ) : (
        <>
          <AnalyticsVisitorsDayChart
            uniqueRows={uniqueRows}
            sessionRows={sessionRows}
          />
          <table className="mt-4 w-full border-collapse text-left text-base">
            <thead>
              <tr className="border-b border-swg-black/20">
                <th className="py-2 pr-3 font-semibold">Tag</th>
                <th className="py-2 pr-3 font-semibold">Unique</th>
                <th className="py-2 pr-3 font-semibold">Sessions</th>
                <th className="py-2 font-semibold">Alle fertig</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="border-b border-swg-black/10">
                  <td className="py-2 pr-3">{formatDay(day)}</td>
                  <td className="py-2 pr-3">{uniqueMap.get(day) ?? 0}</td>
                  <td className="py-2 pr-3">{sessionMap.get(day) ?? 0}</td>
                  <td className="py-2">{allCompleteMap.get(day) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && onLoadMore ? (
            <button
              type="button"
              className="mt-3 rounded border border-swg-black/30 px-3 py-1.5 text-base disabled:opacity-60"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Lade…" : "Weitere 20 Tage laden"}
            </button>
          ) : null}
        </>
      )}
    </AnalyticsCollapsibleSection>
  );
}
