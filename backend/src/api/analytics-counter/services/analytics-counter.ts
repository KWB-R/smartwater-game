/**
 * Aktualisiert Statistikzähler und fasst sie für die Auswertung zusammen.
 */

import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

import { blocksToPlainText } from '../../../utils/blocksToPreview';

const UID = 'api::analytics-counter.analytics-counter' as const;
const LEVEL_UID = 'api::level.level' as const;

export type AnalyticsMetric =
  | 'unique_visit'
  | 'session_start'
  | 'level_start'
  | 'quiz_answer'
  | 'all_levels_complete';

export type TrackPayload = {
  metric: AnalyticsMetric;
  day: string;
  levelSlug?: string | null;
  answerIndex?: number | null;
  isCorrect?: boolean | null;
};

export type DayCount = { day: string; count: number };
export type LevelStartCount = {
  levelSlug: string;
  levelTitle: string;
  count: number;
};
export type QuizAnswerCount = {
  levelSlug: string;
  levelTitle: string;
  questionLabel: string;
  answerIndex: number;
  answerLabel: string;
  isCorrect: boolean;
  count: number;
};

export type DaysPagination = {
  total: number;
  limit: number | null;
  offset: number;
  hasMore: boolean;
};

export type AnalyticsSummary = {
  uniqueVisitorsByDay: DayCount[];
  sessionsByDay: DayCount[];
  allLevelsCompleteByDay: DayCount[];
  uniqueVisitorsTotal: number;
  sessionsTotal: number;
  allLevelsCompleteTotal: number;
  levelStarts: LevelStartCount[];
  quizAnswers: QuizAnswerCount[];
  daysPagination: DaysPagination;
};

export type SummaryDayPage = {
  dayLimit?: number;
  dayOffset?: number;
};

type CounterRow = {
  documentId: string;
  metric: AnalyticsMetric;
  day: string;
  levelSlug?: string | null;
  answerIndex?: number | null;
  isCorrect?: boolean | null;
  count?: number | null;
};

type LevelLookup = {
  titleByKey: Map<string, string>;
  questionLabelByKey: Map<string, string>;
  answerLabelByKey: Map<string, string>;
};

function buildFilters(payload: TrackPayload) {
  const filters: Record<string, unknown> = {
    metric: { $eq: payload.metric },
    day: { $eq: payload.day },
  };

  if (payload.levelSlug == null || payload.levelSlug === '') {
    filters.levelSlug = { $null: true };
  } else {
    filters.levelSlug = { $eq: payload.levelSlug };
  }

  if (payload.answerIndex == null) {
    filters.answerIndex = { $null: true };
  } else {
    filters.answerIndex = { $eq: payload.answerIndex };
  }

  if (payload.isCorrect == null) {
    filters.isCorrect = { $null: true };
  } else {
    filters.isCorrect = { $eq: payload.isCorrect };
  }

  return filters;
}

async function incrementCounter(
  strapi: Core.Strapi,
  payload: TrackPayload,
): Promise<void> {
  const filters = buildFilters(payload);
  const existing = (await strapi.documents(UID).findMany({
    filters,
    limit: 1,
  })) as CounterRow[];

  const row = existing[0];
  if (row) {
    const next = Math.max(0, Number(row.count ?? 0)) + 1;
    await strapi.documents(UID).update({
      documentId: row.documentId,
      data: { count: next },
    });
    return;
  }

  await strapi.documents(UID).create({
    data: {
      metric: payload.metric,
      day: payload.day,
      levelSlug: payload.levelSlug ?? null,
      answerIndex: payload.answerIndex ?? null,
      isCorrect: payload.isCorrect ?? null,
      count: 1,
    },
  });
}

function dayInRange(day: string, from?: string, to?: string): boolean {
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function aggregateByDay(
  rows: CounterRow[],
  metric: AnalyticsMetric,
  from?: string,
  to?: string,
): DayCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.metric !== metric) continue;
    if (!dayInRange(row.day, from, to)) continue;
    map.set(row.day, (map.get(row.day) ?? 0) + Number(row.count ?? 0));
  }
  return [...map.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Paginiert die gemeinsamen Kalendertage aller Datenreihen, beginnend mit dem neuesten Tag. */
function paginateDaySeries(
  seriesList: DayCount[][],
  dayLimit?: number,
  dayOffset = 0,
): { seriesList: DayCount[][]; pagination: DaysPagination } {
  const daySet = new Set<string>();
  for (const rows of seriesList) {
    for (const row of rows) {
      daySet.add(row.day);
    }
  }
  const allDays = [...daySet].sort((a, b) => b.localeCompare(a));
  const total = allDays.length;
  const offset = Math.max(0, Math.floor(dayOffset) || 0);
  const hasLimit =
    typeof dayLimit === 'number' &&
    Number.isFinite(dayLimit) &&
    dayLimit > 0;
  const limit = hasLimit ? Math.floor(dayLimit) : null;
  const pageDays = new Set(
    limit == null ? allDays : allDays.slice(offset, offset + limit),
  );
  const pagination: DaysPagination = {
    total,
    limit,
    offset,
    hasMore: limit != null && offset + pageDays.size < total,
  };

  return {
    seriesList: seriesList.map((rows) =>
      rows
        .filter((row) => pageDays.has(row.day))
        .sort((a, b) => b.day.localeCompare(a.day)),
    ),
    pagination,
  };
}

function resolveLevelTitle(lookup: LevelLookup, levelKey: string): string {
  return lookup.titleByKey.get(levelKey) ?? levelKey;
}

function resolveAnswerLabel(
  lookup: LevelLookup,
  levelKey: string,
  answerIndex: number,
): string {
  const label = lookup.answerLabelByKey.get(`${levelKey}|${answerIndex}`);
  if (label) {
    return label;
  }
  return `Antwort ${answerIndex + 1}`;
}

function resolveQuestionLabel(lookup: LevelLookup, levelKey: string): string {
  return lookup.questionLabelByKey.get(levelKey) ?? '';
}

function aggregateLevelStarts(
  rows: CounterRow[],
  lookup: LevelLookup,
  from?: string,
  to?: string,
): LevelStartCount[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.metric !== 'level_start') continue;
    if (!dayInRange(row.day, from, to)) continue;
    const slug = row.levelSlug?.trim();
    if (!slug) continue;
    map.set(slug, (map.get(slug) ?? 0) + Number(row.count ?? 0));
  }
  return [...map.entries()]
    .map(([levelSlug, count]) => ({
      levelSlug,
      levelTitle: resolveLevelTitle(lookup, levelSlug),
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.levelTitle.localeCompare(b.levelTitle),
    );
}

function aggregateQuizAnswers(
  rows: CounterRow[],
  lookup: LevelLookup,
  from?: string,
  to?: string,
): QuizAnswerCount[] {
  const map = new Map<string, QuizAnswerCount>();
  for (const row of rows) {
    if (row.metric !== 'quiz_answer') continue;
    if (!dayInRange(row.day, from, to)) continue;
    const slug = row.levelSlug?.trim();
    if (!slug || row.answerIndex == null || row.isCorrect == null) continue;
    const key = `${slug}|${row.answerIndex}|${row.isCorrect ? 1 : 0}`;
    const prev = map.get(key);
    const add = Number(row.count ?? 0);
    if (prev) {
      prev.count += add;
    } else {
      map.set(key, {
        levelSlug: slug,
        levelTitle: resolveLevelTitle(lookup, slug),
        questionLabel: resolveQuestionLabel(lookup, slug),
        answerIndex: row.answerIndex,
        answerLabel: resolveAnswerLabel(lookup, slug, row.answerIndex),
        isCorrect: row.isCorrect,
        count: add,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      a.levelTitle.localeCompare(b.levelTitle) ||
      a.answerIndex - b.answerIndex ||
      Number(b.isCorrect) - Number(a.isCorrect),
  );
}

function registerLevelKeys(
  titleByKey: Map<string, string>,
  questionLabelByKey: Map<string, string>,
  answerLabelByKey: Map<string, string>,
  keys: string[],
  title: string,
  quiz: { content?: unknown; answers?: unknown } | null | undefined,
) {
  const question =
    blocksToPlainText(quiz?.content) || '';
  for (const key of keys) {
    if (!key) continue;
    titleByKey.set(key, title);
    if (question) {
      questionLabelByKey.set(key, question);
    }
  }

  const answers = quiz?.answers;
  if (!Array.isArray(answers)) {
    return;
  }

  answers.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const answer = entry as {
      content?: unknown;
      preview?: string | null;
    };
    const fromPreview =
      typeof answer.preview === 'string' ? answer.preview.trim() : '';
    const fromContent = blocksToPlainText(answer.content);
    const label = fromPreview || fromContent || `Antwort ${index + 1}`;
    for (const key of keys) {
      if (!key) continue;
      answerLabelByKey.set(`${key}|${index}`, label);
    }
  });
}

async function loadLevelLookup(strapi: Core.Strapi): Promise<LevelLookup> {
  const titleByKey = new Map<string, string>();
  const questionLabelByKey = new Map<string, string>();
  const answerLabelByKey = new Map<string, string>();

  type LevelRow = {
    id?: number | string;
    documentId?: string;
    name?: string | null;
    slug?: string | null;
    quiz?: { content?: unknown; answers?: unknown } | null;
  };

  const ingest = (levels: LevelRow[]) => {
    for (const level of levels) {
      const title =
        (level.name ?? '').trim() ||
        (level.slug ?? '').trim() ||
        (level.documentId ?? '').trim() ||
        'Level';
      const keys = [
        level.slug?.trim(),
        level.documentId?.trim(),
        level.id != null ? String(level.id) : undefined,
      ].filter((value): value is string => Boolean(value));
      if (keys.length === 0) {
        continue;
      }
      registerLevelKeys(
        titleByKey,
        questionLabelByKey,
        answerLabelByKey,
        keys,
        title,
        level.quiz,
      );
    }
  };

  // Die Datenbankabfrage liefert Namen, Slug und documentId auch für mehrsprachige Inhalte.
  try {
    const dbLevels = (await strapi.db.query(LEVEL_UID).findMany({
      select: ['id', 'documentId', 'name', 'slug'],
      populate: {
        quiz: {
          populate: ['answers'],
        },
      },
    })) as LevelRow[];
    ingest(dbLevels);
  } catch (error) {
    strapi.log.warn('analytics level lookup via db.query failed', error);
  }

  // Die Documents-API ergänzt Beziehungen und lokalisierte Inhalte.
  if (titleByKey.size === 0 || answerLabelByKey.size === 0) {
    try {
      const docLevels = (await strapi.documents(LEVEL_UID).findMany({
        locale: '*',
        status: 'published',
        limit: 500,
        populate: {
          quiz: {
            populate: {
              answers: true,
            },
          },
        },
      })) as LevelRow[];
      ingest(docLevels);
    } catch (error) {
      strapi.log.warn('analytics level lookup via documents failed', error);
    }
  }

  // Falls keine veröffentlichten Inhalte vorliegen, auch Entwürfe berücksichtigen.
  if (titleByKey.size === 0) {
    try {
      const draftLevels = (await strapi.documents(LEVEL_UID).findMany({
        locale: '*',
        status: 'draft',
        limit: 500,
        fields: ['name', 'slug'],
      })) as LevelRow[];
      ingest(draftLevels);
    } catch (error) {
      strapi.log.warn('analytics level draft lookup failed', error);
    }
  }

  return { titleByKey, questionLabelByKey, answerLabelByKey };
}

async function buildSummary(
  strapi: Core.Strapi,
  from?: string,
  to?: string,
  dayPage?: SummaryDayPage,
): Promise<AnalyticsSummary> {
  const [rows, lookup] = await Promise.all([
    strapi.documents(UID).findMany({
      limit: 10_000,
    }) as Promise<CounterRow[]>,
    loadLevelLookup(strapi),
  ]);

  const allLevelsCompleteByDayFull = aggregateByDay(
    rows,
    'all_levels_complete',
    from,
    to,
  );
  const uniqueFull = aggregateByDay(rows, 'unique_visit', from, to);
  const sessionsFull = aggregateByDay(rows, 'session_start', from, to);

  const { seriesList, pagination } = paginateDaySeries(
    [uniqueFull, sessionsFull, allLevelsCompleteByDayFull],
    dayPage?.dayLimit,
    dayPage?.dayOffset ?? 0,
  );
  const [uniqueVisitorsByDay, sessionsByDay, allLevelsCompleteByDay] =
    seriesList;

  return {
    uniqueVisitorsByDay: uniqueVisitorsByDay ?? [],
    sessionsByDay: sessionsByDay ?? [],
    allLevelsCompleteByDay: allLevelsCompleteByDay ?? [],
    uniqueVisitorsTotal: uniqueFull.reduce((sum, row) => sum + row.count, 0),
    sessionsTotal: sessionsFull.reduce((sum, row) => sum + row.count, 0),
    allLevelsCompleteTotal: allLevelsCompleteByDayFull.reduce(
      (sum, row) => sum + row.count,
      0,
    ),
    levelStarts: aggregateLevelStarts(rows, lookup, from, to),
    quizAnswers: aggregateQuizAnswers(rows, lookup, from, to),
    daysPagination: pagination,
  };
}

async function resetAllCounters(strapi: Core.Strapi): Promise<number> {
  const rows = (await strapi.documents(UID).findMany({
    limit: 10_000,
    fields: ['documentId'],
  })) as Array<{ documentId: string }>;

  let deleted = 0;
  for (const row of rows) {
    if (!row.documentId) continue;
    await strapi.documents(UID).delete({ documentId: row.documentId });
    deleted += 1;
  }
  return deleted;
}

export default factories.createCoreService(UID, ({ strapi }) => ({
  async trackEvent(payload: TrackPayload) {
    await incrementCounter(strapi, payload);
  },

  async summary(from?: string, to?: string, dayPage?: SummaryDayPage) {
    return buildSummary(strapi, from, to, dayPage);
  },

  async resetAll() {
    return resetAllCounters(strapi);
  },
}));
