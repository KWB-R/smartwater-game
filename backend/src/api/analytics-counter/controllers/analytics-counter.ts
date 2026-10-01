/**
 * Öffentliche Ereigniserfassung und geschützte Statistikauswertung.
 */

import { factories } from '@strapi/strapi';

import type {
  AnalyticsMetric,
  TrackPayload,
} from '../services/analytics-counter';

const UID = 'api::analytics-counter.analytics-counter' as const;

const METRICS = new Set<AnalyticsMetric>([
  'unique_visit',
  'session_start',
  'level_start',
  'quiz_answer',
  'all_levels_complete',
]);

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

/** Begrenzt Anfragen je IP im Arbeitsspeicher; IP-Adressen werden nicht in der Datenbank gespeichert. */
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;

function clientIp(ctx: { request?: { ip?: string }; ip?: string }): string {
  return ctx.request?.ip || ctx.ip || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const prev = rateBuckets.get(ip) ?? [];
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcOffsetDay(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function isAllowedDay(day: string): boolean {
  const allowed = new Set([
    utcOffsetDay(-1),
    utcToday(),
    utcOffsetDay(1),
  ]);
  return allowed.has(day);
}

function parseTrackBody(body: unknown): TrackPayload | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Invalid body' };
  }
  const raw = body as Record<string, unknown>;
  const metric = raw.metric;
  if (typeof metric !== 'string' || !METRICS.has(metric as AnalyticsMetric)) {
    return { error: 'Invalid metric' };
  }
  const day = raw.day;
  if (typeof day !== 'string' || !DAY_RE.test(day) || !isAllowedDay(day)) {
    return { error: 'Invalid day' };
  }

  const payload: TrackPayload = {
    metric: metric as AnalyticsMetric,
    day,
  };

  if (metric === 'unique_visit' || metric === 'session_start' || metric === 'all_levels_complete') {
    return payload;
  }

  const levelSlug = raw.levelSlug;
  if (typeof levelSlug !== 'string' || !SLUG_RE.test(levelSlug)) {
    return { error: 'Invalid levelSlug' };
  }
  payload.levelSlug = levelSlug;

  if (metric === 'level_start') {
    return payload;
  }

  const answerIndex = raw.answerIndex;
  if (
    typeof answerIndex !== 'number' ||
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex > 64
  ) {
    return { error: 'Invalid answerIndex' };
  }
  if (typeof raw.isCorrect !== 'boolean') {
    return { error: 'Invalid isCorrect' };
  }
  payload.answerIndex = answerIndex;
  payload.isCorrect = raw.isCorrect;
  return payload;
}

function parseDateQuery(value: unknown): string | undefined {
  if (typeof value !== 'string' || !DAY_RE.test(value)) {
    return undefined;
  }
  return value;
}

function parseNonNegInt(value: unknown, max: number): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (value < 0 || value > max) return undefined;
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const n = Number(value);
    if (n > max) return undefined;
    return n;
  }
  return undefined;
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  async track(ctx) {
    if (isRateLimited(clientIp(ctx))) {
      ctx.status = 429;
      ctx.body = { error: 'Too many requests' };
      return;
    }

    const parsed = parseTrackBody(ctx.request.body);
    if ('error' in parsed) {
      ctx.status = 400;
      ctx.body = { error: parsed.error };
      return;
    }

    try {
      const service = strapi.service(UID) as {
        trackEvent: (payload: TrackPayload) => Promise<void>;
      };
      await service.trackEvent(parsed);
      ctx.body = { ok: true };
    } catch (error) {
      strapi.log.error('analytics track failed', error);
      ctx.status = 500;
      ctx.body = { error: 'Track failed' };
    }
  },

  async summary(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const from = parseDateQuery(ctx.query.from);
    const to = parseDateQuery(ctx.query.to);
    const dayLimit = parseNonNegInt(ctx.query.dayLimit, 500);
    const dayOffset = parseNonNegInt(ctx.query.dayOffset, 10_000) ?? 0;

    try {
      const service = strapi.service(UID) as {
        summary: (
          from?: string,
          to?: string,
          dayPage?: { dayLimit?: number; dayOffset?: number },
        ) => Promise<unknown>;
      };
      ctx.body = await service.summary(from, to, {
        dayLimit: dayLimit && dayLimit > 0 ? dayLimit : undefined,
        dayOffset,
      });
    } catch (error) {
      strapi.log.error('analytics summary failed', error);
      ctx.status = 500;
      ctx.body = { error: 'Summary failed' };
    }
  },

  async reset(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const body = ctx.request.body as { password?: unknown } | undefined;
    const password =
      typeof body?.password === 'string' ? body.password : '';
    const expected =
      process.env.ANALYTICS_RESET_PASSWORD?.trim() || 'smartwater';

    if (password !== expected) {
      ctx.status = 403;
      ctx.body = { error: 'Invalid reset password' };
      return;
    }

    try {
      const service = strapi.service(UID) as {
        resetAll: () => Promise<number>;
      };
      const deleted = await service.resetAll();
      ctx.body = { ok: true, deleted };
    } catch (error) {
      strapi.log.error('analytics reset failed', error);
      ctx.status = 500;
      ctx.body = { error: 'Reset failed' };
    }
  },
}));
