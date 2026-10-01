import type { ReactNode } from "react";
import type {
  AnalyticsRangeMode,
  DateRangeShortcut,
} from "@/features/analytics/dateRangePresets";
import {
  DATE_RANGE_SHORTCUTS,
  QUARTER_OPTIONS,
  availableYears,
  monthLabel,
} from "@/features/analytics/dateRangePresets";

type AnalyticsDateRangeFilterProps = {
  mode: AnalyticsRangeMode;
  year: number;
  monthIndex: number;
  quarter: number;
  from: string;
  to: string;
  disabled?: boolean;
  compact?: boolean;
  onModeChange: (mode: AnalyticsRangeMode) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (monthIndex: number) => void;
  onQuarterChange: (quarter: number) => void;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  onApply: () => void;
  onShortcut?: (shortcut: DateRangeShortcut) => void;
};

const MODE_OPTIONS: { value: AnalyticsRangeMode; label: string }[] = [
  { value: "year", label: "Jahr" },
  { value: "month", label: "Monat" },
  { value: "quarter", label: "Quartal" },
  { value: "custom", label: "Zeitraum" },
];

const inputClass =
  "rounded border border-swg-black/20 bg-white px-2 py-1 text-base";

const inputClassCompact =
  "rounded border border-swg-black/20 bg-white px-1.5 py-0.5 text-base";

function FilterField({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: ReactNode;
}) {
  if (compact) {
    return (
      <label className="flex items-center gap-1.5 text-base opacity-80">
        <span className="shrink-0">{label}</span>
        {children}
      </label>
    );
  }
  return (
    <label className="flex flex-col gap-1 text-base uppercase tracking-wide opacity-70">
      {label}
      {children}
    </label>
  );
}

export function AnalyticsDateRangeFilter({
  mode,
  year,
  monthIndex,
  quarter,
  from,
  to,
  disabled,
  compact,
  onModeChange,
  onYearChange,
  onMonthChange,
  onQuarterChange,
  onFromChange,
  onToChange,
  onApply,
  onShortcut,
}: AnalyticsDateRangeFilterProps) {
  const years = availableYears();
  const ic = compact ? inputClassCompact : inputClass;
  const shortcutGroupClass = compact
    ? "mt-1.5 inline-flex max-w-full overflow-x-auto rounded border border-swg-black/25 bg-white"
    : "mt-2 inline-flex max-w-full overflow-x-auto rounded-md border border-swg-black/25 bg-white";
  const shortcutItemClass = compact
    ? "shrink-0 border-r border-swg-black/25 px-2 py-0.5 text-base last:border-r-0 hover:bg-swg-black/[0.04] disabled:opacity-60"
    : "shrink-0 border-r border-swg-black/25 px-2.5 py-1 text-base last:border-r-0 hover:bg-swg-black/[0.04] disabled:opacity-60";

  return (
    <div className={compact ? "w-full" : undefined}>
      <form
        className={
          compact
            ? "flex flex-wrap items-center gap-x-2 gap-y-1"
            : "mt-3 flex flex-wrap items-end gap-3"
        }
        onSubmit={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
      <FilterField label="Filter" compact={compact}>
        <select
          className={ic}
          value={mode}
          disabled={disabled}
          onChange={(e) => onModeChange(e.target.value as AnalyticsRangeMode)}
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FilterField>

      {mode !== "custom" ? (
        <FilterField label="Jahr" compact={compact}>
          <select
            className={ic}
            value={year}
            disabled={disabled}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </FilterField>
      ) : null}

      {mode === "month" ? (
        <FilterField label="Monat" compact={compact}>
          <select
            className={ic}
            value={monthIndex}
            disabled={disabled}
            onChange={(e) => onMonthChange(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {monthLabel(i)}
              </option>
            ))}
          </select>
        </FilterField>
      ) : null}

      {mode === "quarter" ? (
        <FilterField label="Q" compact={compact}>
          <select
            className={ic}
            value={quarter}
            disabled={disabled}
            onChange={(e) => onQuarterChange(Number(e.target.value))}
          >
            {QUARTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {compact ? `Q${opt.value}` : opt.label}
              </option>
            ))}
          </select>
        </FilterField>
      ) : null}

      {mode === "custom" ? (
        <>
          <FilterField label="Von" compact={compact}>
            <input
              className={ic}
              type="date"
              value={from}
              disabled={disabled}
              onChange={(e) => onFromChange(e.target.value)}
              required
            />
          </FilterField>
          <FilterField label="Bis" compact={compact}>
            <input
              className={ic}
              type="date"
              value={to}
              disabled={disabled}
              onChange={(e) => onToChange(e.target.value)}
              required
            />
          </FilterField>
        </>
      ) : null}

      <button
        type="submit"
        className={
          compact
            ? "shrink-0 rounded bg-swg-blue-dark px-2 py-0.5 font-display text-base font-bold uppercase tracking-wide text-white disabled:opacity-60"
            : "rounded bg-swg-blue-dark px-3 py-1.5 font-display text-base font-bold uppercase tracking-wide text-white disabled:opacity-60"
        }
        disabled={disabled}
      >
        Anwenden
      </button>
      </form>
      {onShortcut ? (
        <div
          className={shortcutGroupClass}
          role="group"
          aria-label="Zeitraum Schnellauswahl"
        >
          {DATE_RANGE_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              className={shortcutItemClass}
              disabled={disabled}
              onClick={() => onShortcut(shortcut.id)}
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
