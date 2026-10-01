import { buildAxisTicks, niceCeil } from "@/features/analytics/chartAxis";
import { useMemo } from "react";
import type { AnalyticsQuizAnswerCount } from "@/features/analytics/types";
import { sortAnalyticsQuizRows } from "@/features/analytics/sortAnalyticsLevels";
import type { District } from "@/types/content";

type QuizAnswerBarsProps = {
  rows: AnalyticsQuizAnswerCount[];
  districts?: District[] | null;
};

type AnswerBar = {
  letter: string;
  label: string;
  count: number;
  isCorrect: boolean;
  answerIndex: number;
};

type LevelGroup = {
  levelKey: string;
  levelTitle: string;
  questionLabel: string;
  answers: AnswerBar[];
};

const LABEL_COL = "minmax(0,14rem) minmax(0,1fr) 2.5rem";

const answerLabelClass = (isCorrect: boolean) =>
  isCorrect
    ? "font-text text-base font-normal not-italic leading-snug text-[var(--swg-green-dark)]"
    : "font-text text-base font-normal not-italic leading-snug text-[var(--swg-blue-mid)]";

/** Pro Level: Frage, Antworttexte und Balken. */
export function QuizAnswerBars({ rows, districts = null }: QuizAnswerBarsProps) {
  const sortedRows = useMemo(
    () => sortAnalyticsQuizRows(rows, districts),
    [rows, districts],
  );
  const groups = useMemo(() => groupByLevel(sortedRows), [sortedRows]);

  const dataMax = useMemo(() => {
    let max = 0;
    for (const group of groups) {
      for (const answer of group.answers) {
        max = Math.max(max, answer.count);
      }
    }
    return Math.max(max, 1);
  }, [groups]);

  /** Gemeinsame Skala für Balkenbreite und Achsenbeschriftung. */
  const axisMax = useMemo(() => niceCeil(dataMax), [dataMax]);
  const axisTicks = useMemo(() => buildAxisTicks(axisMax), [axisMax]);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {groups.map((group) => (
        <section
          key={group.levelKey}
          className="rounded border border-swg-black/15 bg-white/70 px-3 pb-3 pt-2.5"
        >
          <h3 className="font-text text-base font-bold not-italic">
            {group.levelTitle}
          </h3>
          {group.questionLabel ? (
            <p className="mt-2 text-base leading-snug text-swg-black/80">
              {group.questionLabel}
            </p>
          ) : null}
          <div
            className="mt-3 flex flex-col gap-2"
            role="img"
            aria-label={`Antworten für ${group.levelTitle}`}
          >
            {group.answers.map((answer) => {
              const pct = (answer.count / axisMax) * 100;
              return (
                <div
                  key={answer.answerIndex}
                  className="grid items-center gap-2"
                  style={{ gridTemplateColumns: LABEL_COL }}
                >
                  <span className={answerLabelClass(answer.isCorrect)}>
                    <span className="opacity-60">{answer.letter}: </span>
                    {answer.label}
                  </span>
                  <div className="h-5 w-full" aria-hidden>
                    <div
                      className={
                        answer.isCorrect
                          ? "h-full rounded-sm bg-[var(--swg-green-dark)]"
                          : "h-full rounded-sm bg-[var(--swg-blue-mid)]"
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-right font-text text-base font-bold not-italic tabular-nums">
                    {answer.count}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: LABEL_COL }}
          >
            <span />
            <div className="relative h-4 border-t border-swg-black/40">
              {axisTicks.map((tick) => {
                const leftPct = (tick / axisMax) * 100;
                return (
                  <span
                    key={tick}
                    className="absolute top-1 -translate-x-1/2 text-[0.65rem] tabular-nums text-swg-black/50 first:translate-x-0 last:translate-x-[-100%]"
                    style={{ left: `${leftPct}%` }}
                  >
                    {tick}
                  </span>
                );
              })}
            </div>
            <span />
          </div>
        </section>
      ))}
      <p className="text-base opacity-60">
        <span className="mr-3 inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--swg-green-dark)]" />
          richtig
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--swg-blue-mid)]" />
          falsch
        </span>
      </p>
    </div>
  );
}

function answerLetter(index: number): string {
  if (index >= 0 && index < 26) {
    return String.fromCharCode(65 + index);
  }
  return String(index + 1);
}

function groupByLevel(rows: AnalyticsQuizAnswerCount[]): LevelGroup[] {
  const map = new Map<string, LevelGroup>();

  for (const row of rows) {
    const levelKey = row.levelSlug;
    let group = map.get(levelKey);
    if (!group) {
      group = {
        levelKey,
        levelTitle: row.levelTitle || row.levelSlug,
        questionLabel: row.questionLabel || "",
        answers: [],
      };
      map.set(levelKey, group);
    } else if (!group.questionLabel && row.questionLabel) {
      group.questionLabel = row.questionLabel;
    }

    const existing = group.answers.find(
      (a) => a.answerIndex === row.answerIndex,
    );
    if (existing) {
      existing.count += row.count;
      if (row.isCorrect) {
        existing.isCorrect = true;
        existing.label = row.answerLabel || existing.label;
      }
    } else {
      group.answers.push({
        letter: answerLetter(row.answerIndex),
        label: row.answerLabel || `Antwort ${row.answerIndex + 1}`,
        count: row.count,
        isCorrect: row.isCorrect,
        answerIndex: row.answerIndex,
      });
    }
  }

  for (const group of map.values()) {
    group.answers.sort((a, b) => a.answerIndex - b.answerIndex);
  }

  return [...map.values()];
}
