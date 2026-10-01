import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  confirmAnalyticsTotp,
  fetchAnalyticsSummary,
  loginAnalyticsPassword,
  logoutAnalytics,
  readAnalyticsJwt,
  setupAnalyticsTotp,
  verifyAnalyticsTotp,
} from "@/api/services/analyticsService";
import { fetchDistricts } from "@/api/services/bezirkService";
import { StrapiFetchError } from "@/api/client";
import {
  AnalyticsCollapsibleSection,
  analyticsSectionStickyHeaderClassName,
  analyticsSectionStickyHeaderStyle,
} from "@/components/features/analytics/AnalyticsCollapsibleSection";
import { AnalyticsDateRangeFilter } from "@/components/features/analytics/AnalyticsDateRangeFilter";
import { AnalyticsDayTable } from "@/components/features/analytics/AnalyticsDayTable";
import { QuizAnswerBars } from "@/components/features/analytics/QuizAnswerBars";
import type {
  AnalyticsDayCount,
  AnalyticsSummary,
} from "@/features/analytics/types";
import { sortAnalyticsLevelStarts } from "@/features/analytics/sortAnalyticsLevels";
import type { District } from "@/types/content";
import {
  DAY_PAGE_SIZE,
  formatDay,
  currentUtcCalendarParts,
  defaultCustomRange,
  draftStateForDateShortcut,
  mergeDayCounts,
  normalizeRange,
  rangeForMonth,
  rangeForQuarter,
  rangeForYear,
  type AnalyticsRangeMode,
  type DateRange,
  type DateRangeShortcut,
} from "@/features/analytics/dateRangePresets";
import { useAnalyticsNoIndex } from "@/features/analytics/useAnalyticsNoIndex";
import { isStrapiConfigured } from "@/lib/env";

/** Die Statistikseite scrollt selbst, da der App-Viewport keine überlaufenden Inhalte zeigt. */
function AnalyticsScrollShell({ children }: { children: ReactNode }) {
  return (
    <div
      data-analytics-page
      className="h-full overflow-y-auto overscroll-y-contain bg-swg-black/[0.04] text-base font-text text-swg-black"
    >
      {children}
    </div>
  );
}

function sumCounts(rows: { count: number }[]): number {
  return rows.reduce((acc, row) => acc + row.count, 0);
}

function resolveDraftRange(
  mode: AnalyticsRangeMode,
  year: number,
  monthIndex: number,
  quarter: number,
  from: string,
  to: string,
): DateRange {
  if (mode === "year") return rangeForYear(year);
  if (mode === "month") return rangeForMonth(year, monthIndex);
  if (mode === "quarter") return rangeForQuarter(year, quarter);
  return normalizeRange(from, to);
}

type AnalyticsDaysState = {
  uniqueVisitorsByDay: AnalyticsDayCount[];
  sessionsByDay: AnalyticsDayCount[];
  allLevelsCompleteByDay: AnalyticsDayCount[];
  daysTotal: number;
  hasMore: boolean;
};

function emptyDayFallback(): AnalyticsDaysState {
  return {
    uniqueVisitorsByDay: [],
    sessionsByDay: [],
    allLevelsCompleteByDay: [],
    daysTotal: 0,
    hasMore: false,
  };
}

function unionDayCount(
  uniqueRows: AnalyticsDayCount[],
  sessionRows: AnalyticsDayCount[],
  allCompleteRows: AnalyticsDayCount[],
): number {
  const set = new Set<string>();
  for (const row of uniqueRows) set.add(row.day);
  for (const row of sessionRows) set.add(row.day);
  for (const row of allCompleteRows) set.add(row.day);
  return set.size;
}

function resolveDaysMeta(
  data: AnalyticsSummary,
  loadedDayCountValue: number,
  previousTotal = 0,
): { daysTotal: number; hasMore: boolean } {
  const pagination = data.daysPagination;
  if (!pagination) {
    return {
      daysTotal: Math.max(loadedDayCountValue, previousTotal),
      hasMore: false,
    };
  }
  const daysTotal = Math.max(
    pagination.total,
    loadedDayCountValue,
    previousTotal,
  );
  return {
    daysTotal,
    hasMore: pagination.hasMore,
  };
}

function daysFromSummary(data: AnalyticsSummary): AnalyticsDaysState {
  const uniqueVisitorsByDay = data.uniqueVisitorsByDay;
  const sessionsByDay = data.sessionsByDay;
  const allLevelsCompleteByDay = data.allLevelsCompleteByDay ?? [];
  const loaded = unionDayCount(
    uniqueVisitorsByDay,
    sessionsByDay,
    allLevelsCompleteByDay,
  );
  const { daysTotal, hasMore } = resolveDaysMeta(data, loaded);
  return {
    uniqueVisitorsByDay,
    sessionsByDay,
    allLevelsCompleteByDay,
    daysTotal,
    hasMore,
  };
}

function appendDays(
  prev: AnalyticsDaysState,
  data: AnalyticsSummary,
): AnalyticsDaysState {
  const uniqueVisitorsByDay = mergeDayCounts(
    prev.uniqueVisitorsByDay,
    data.uniqueVisitorsByDay,
  );
  const sessionsByDay = mergeDayCounts(prev.sessionsByDay, data.sessionsByDay);
  const allLevelsCompleteByDay = mergeDayCounts(
    prev.allLevelsCompleteByDay,
    data.allLevelsCompleteByDay ?? [],
  );
  const loaded = unionDayCount(
    uniqueVisitorsByDay,
    sessionsByDay,
    allLevelsCompleteByDay,
  );
  const { daysTotal, hasMore } = resolveDaysMeta(data, loaded, prev.daysTotal);
  return {
    uniqueVisitorsByDay,
    sessionsByDay,
    allLevelsCompleteByDay,
    daysTotal,
    hasMore,
  };
}

function loadedDayCount(state: AnalyticsDaysState): number {
  const set = new Set<string>();
  for (const row of state.uniqueVisitorsByDay) set.add(row.day);
  for (const row of state.sessionsByDay) set.add(row.day);
  for (const row of state.allLevelsCompleteByDay) set.add(row.day);
  return set.size;
}

export function AnalyticsPage() {
  useAnalyticsNoIndex();

  const initialParts = currentUtcCalendarParts();
  const initialCustom = defaultCustomRange();

  const [jwt, setJwt] = useState<string | null>(() => readAnalyticsJwt());
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loginStep, setLoginStep] = useState<"password" | "totp" | "setup">(
    "password",
  );
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [days, setDays] = useState<AnalyticsDaysState>(emptyDayFallback);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [appliedRange, setAppliedRange] = useState<DateRange>(initialCustom);
  const [mode, setMode] = useState<AnalyticsRangeMode>("custom");
  const [year, setYear] = useState(initialParts.year);
  const [monthIndex, setMonthIndex] = useState(initialParts.monthIndex);
  const [quarter, setQuarter] = useState(initialParts.quarter);
  const [draftFrom, setDraftFrom] = useState(initialCustom.from);
  const [draftTo, setDraftTo] = useState(initialCustom.to);

  const [districts, setDistricts] = useState<District[]>([]);

  const analyticsToolbarRef = useRef<HTMLDivElement>(null);
  const [sectionStickyTop, setSectionStickyTop] = useState(0);

  const syncSectionStickyTop = useCallback(() => {
    setSectionStickyTop(analyticsToolbarRef.current?.offsetHeight ?? 0);
  }, []);

  useEffect(() => {
    if (!jwt) return;
    syncSectionStickyTop();
    const el = analyticsToolbarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncSectionStickyTop());
    ro.observe(el);
    window.addEventListener("resize", syncSectionStickyTop);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSectionStickyTop);
    };
  }, [jwt, syncSectionStickyTop, mode, draftFrom, draftTo, loading]);

  useEffect(() => {
    if (!jwt) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    void fetchDistricts()
      .then((data) => {
        if (!cancelled) setDistricts(data);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [jwt]);

  const sortedLevelStarts = useMemo(
    () =>
      summary
        ? sortAnalyticsLevelStarts(summary.levelStarts, districts)
        : [],
    [summary, districts],
  );

  const topLevelStarts = useMemo(() => {
    if (!summary) return [];
    return [...summary.levelStarts]
      .sort(
        (a, b) =>
          b.count - a.count ||
          a.levelTitle.localeCompare(b.levelTitle, "de"),
      )
      .slice(0, TOP_LEVELS_OVERVIEW);
  }, [summary]);

  const loadSummary = useCallback(
    async (range: DateRange, signal?: AbortSignal) => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await fetchAnalyticsSummary({
          from: range.from,
          to: range.to,
          dayLimit: DAY_PAGE_SIZE,
          dayOffset: 0,
          signal,
        });
        setSummary(data);
        setDays(daysFromSummary(data));
        setAppliedRange(range);
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof StrapiFetchError && error.status === 401) {
          logoutAnalytics();
          setJwt(null);
          setSummary(null);
          setDays(emptyDayFallback());
          setLoadError(null);
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Laden fehlgeschlagen",
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!jwt) return;
    const ac = new AbortController();
    void loadSummary(appliedRange, ac.signal);
    return () => ac.abort();
    // Zeitraumänderungen erst über Anwenden oder Aktualisieren laden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jwt, loadSummary]);

  async function handleLoadMore() {
    if (loadingMore || !days.hasMore) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const data = await fetchAnalyticsSummary({
        from: appliedRange.from,
        to: appliedRange.to,
        dayLimit: DAY_PAGE_SIZE,
        dayOffset: loadedDayCount(days),
      });
      setDays((prev) => appendDays(prev, data));
    } catch (error) {
      if (error instanceof StrapiFetchError && error.status === 401) {
        logoutAnalytics();
        setJwt(null);
        setSummary(null);
        setDays(emptyDayFallback());
        return;
      }
      setLoadError(
        error instanceof Error ? error.message : "Nachladen fehlgeschlagen",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function handleModeChange(next: AnalyticsRangeMode) {
    setMode(next);
    if (next === "custom") {
      setDraftFrom(appliedRange.from);
      setDraftTo(appliedRange.to);
    }
  }

  function handleApplyRange() {
    const next = resolveDraftRange(
      mode,
      year,
      monthIndex,
      quarter,
      draftFrom,
      draftTo,
    );
    if (mode === "custom") {
      setDraftFrom(next.from);
      setDraftTo(next.to);
    }
    void loadSummary(next);
  }

  function handleRangeShortcut(shortcut: DateRangeShortcut) {
    const draft = draftStateForDateShortcut(shortcut);
    setMode(draft.mode);
    setYear(draft.year);
    setMonthIndex(draft.monthIndex);
    setQuarter(draft.quarter);
    setDraftFrom(draft.from);
    setDraftTo(draft.to);
    void loadSummary(draft.range);
  }

  function resetLoginFlow() {
    setLoginStep("password");
    setChallengeToken(null);
    setSetupQr(null);
    setSetupSecret(null);
    setTotpCode("");
    setPassword("");
    setLoginError(null);
  }

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError(null);
    setLoginPending(true);
    try {
      const result = await loginAnalyticsPassword(
        identifier.trim(),
        password,
      );
      if (result.status === "totp_required") {
        setChallengeToken(result.challengeToken);
        setLoginStep("totp");
        setPassword("");
        return;
      }
      const setup = await setupAnalyticsTotp(result.challengeToken);
      setChallengeToken(setup.challengeToken);
      setSetupQr(setup.qrDataUrl);
      setSetupSecret(setup.secret);
      setLoginStep("setup");
      setPassword("");
    } catch (error) {
      setLoginError(
        error instanceof StrapiFetchError &&
          (error.status === 400 || error.status === 401)
          ? "Login fehlgeschlagen — Zugangsdaten prüfen."
          : error instanceof Error
            ? error.message
            : "Login fehlgeschlagen",
      );
    } finally {
      setLoginPending(false);
    }
  }

  async function handleTotpLogin(event: FormEvent) {
    event.preventDefault();
    if (!challengeToken) return;
    setLoginError(null);
    setLoginPending(true);
    try {
      const result = await verifyAnalyticsTotp(
        challengeToken,
        totpCode.trim(),
      );
      setJwt(result.jwt);
      resetLoginFlow();
    } catch (error) {
      setLoginError(
        error instanceof StrapiFetchError && error.status === 400
          ? "Ungültiger Code — bitte erneut versuchen."
          : error instanceof Error
            ? error.message
            : "TOTP fehlgeschlagen",
      );
    } finally {
      setLoginPending(false);
    }
  }

  async function handleTotpSetupConfirm(event: FormEvent) {
    event.preventDefault();
    if (!challengeToken) return;
    setLoginError(null);
    setLoginPending(true);
    try {
      const result = await confirmAnalyticsTotp(
        challengeToken,
        totpCode.trim(),
      );
      setJwt(result.jwt);
      resetLoginFlow();
    } catch (error) {
      setLoginError(
        error instanceof StrapiFetchError && error.status === 400
          ? "Ungültiger Code — App-Code prüfen und erneut versuchen."
          : error instanceof Error
            ? error.message
            : "Setup fehlgeschlagen",
      );
    } finally {
      setLoginPending(false);
    }
  }

  function handleLogout() {
    logoutAnalytics();
    setJwt(null);
    setSummary(null);
    setDays(emptyDayFallback());
    resetLoginFlow();
  }

  if (!isStrapiConfigured()) {
    return (
      <AnalyticsScrollShell>
        <div className="mx-auto max-w-lg p-6 font-text text-swg-black">
          <h1 className="font-display text-base font-bold">Analytics</h1>
          <p className="mt-3 text-base">Strapi API ist nicht konfiguriert.</p>
        </div>
      </AnalyticsScrollShell>
    );
  }

  if (!jwt) {
    return (
      <AnalyticsScrollShell>
        <div className="mx-auto flex min-h-full max-w-md flex-col justify-center p-6 font-text text-swg-black">
          <h1 className="font-display text-base font-bold">Analytics Login</h1>
          <p className="mt-2 text-base opacity-80">
            Nur für Admins. Zwei-Faktor-Authentifizierung (TOTP) erforderlich.
          </p>

          {loginStep === "password" ? (
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={handlePasswordLogin}
            >
              <label className="flex flex-col gap-1 text-base">
                E-Mail oder Benutzername
                <input
                  className="rounded border border-swg-black/20 bg-white px-3 py-2"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-base">
                Passwort
                <input
                  className="rounded border border-swg-black/20 bg-white px-3 py-2"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              {loginError ? (
                <p className="text-base text-red-700" role="alert">
                  {loginError}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-2 rounded bg-swg-blue-dark px-4 py-2 font-display text-base font-bold uppercase tracking-wide text-white disabled:opacity-60"
                disabled={loginPending}
              >
                {loginPending ? "…" : "Weiter"}
              </button>
            </form>
          ) : null}

          {loginStep === "totp" ? (
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={handleTotpLogin}
            >
              <p className="text-base opacity-80">
                Code aus der Authenticator-App eingeben.
              </p>
              <label className="flex flex-col gap-1 text-base">
                Einmalcode
                <input
                  className="rounded border border-swg-black/20 bg-white px-3 py-2 tracking-widest"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                />
              </label>
              {loginError ? (
                <p className="text-base text-red-700" role="alert">
                  {loginError}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-2 rounded bg-swg-blue-dark px-4 py-2 font-display text-base font-bold uppercase tracking-wide text-white disabled:opacity-60"
                disabled={loginPending}
              >
                {loginPending ? "…" : "Anmelden"}
              </button>
              <button
                type="button"
                className="text-base underline opacity-70"
                onClick={resetLoginFlow}
              >
                Zurück
              </button>
            </form>
          ) : null}

          {loginStep === "setup" ? (
            <form
              className="mt-6 flex flex-col gap-3"
              onSubmit={handleTotpSetupConfirm}
            >
              <p className="text-base opacity-80">
                Authenticator-App scannen und den angezeigten Code bestätigen.
              </p>
              {setupQr ? (
                <img
                  src={setupQr}
                  alt="TOTP QR-Code"
                  className="mx-auto h-48 w-48 rounded border border-swg-black/10 bg-white p-2"
                />
              ) : null}
              {setupSecret ? (
                <p className="break-all text-center font-mono text-sm opacity-70">
                  {setupSecret}
                </p>
              ) : null}
              <label className="flex flex-col gap-1 text-base">
                Einmalcode zur Bestätigung
                <input
                  className="rounded border border-swg-black/20 bg-white px-3 py-2 tracking-widest"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                />
              </label>
              {loginError ? (
                <p className="text-base text-red-700" role="alert">
                  {loginError}
                </p>
              ) : null}
              <button
                type="submit"
                className="mt-2 rounded bg-swg-blue-dark px-4 py-2 font-display text-base font-bold uppercase tracking-wide text-white disabled:opacity-60"
                disabled={loginPending}
              >
                {loginPending ? "…" : "2FA aktivieren & anmelden"}
              </button>
              <button
                type="button"
                className="text-base underline opacity-70"
                onClick={resetLoginFlow}
              >
                Zurück
              </button>
            </form>
          ) : null}
        </div>
      </AnalyticsScrollShell>
    );
  }

  const uniqueTotal = summary?.uniqueVisitorsTotal ?? 0;
  const sessionTotal = summary?.sessionsTotal ?? 0;
  const levelTotal = summary ? sumCounts(summary.levelStarts) : 0;
  const quizTotal = summary ? sumCounts(summary.quizAnswers) : 0;
  const allCompleteTotal = summary?.allLevelsCompleteTotal ?? 0;
  const levelStartCount = summary?.levelStarts.length ?? 0;
  const quizLevelCount = summary
    ? new Set(summary.quizAnswers.map((row) => row.levelSlug)).size
    : 0;

  return (
    <AnalyticsScrollShell>
      <div
        ref={analyticsToolbarRef}
        className="sticky top-0 z-20 border-b border-swg-black/10 bg-white/95 backdrop-blur-md"
      >
        <div className="mx-auto max-w-5xl px-4 py-2 font-text text-swg-black sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <h1 className="font-display text-base font-bold leading-none">
                Analytics
              </h1>
              <p className="truncate text-base opacity-70">
                {formatDay(appliedRange.from)}–{formatDay(appliedRange.to)} UTC
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded border border-swg-black/30 px-2 py-0.5 text-base"
                onClick={() => void loadSummary(appliedRange)}
                disabled={loading}
              >
                Aktualisieren
              </button>
              <button
                type="button"
                className="rounded border border-swg-black/30 px-2 py-0.5 text-base"
                onClick={handleLogout}
              >
                Abmelden
              </button>
            </div>
          </div>
          <div className="mt-2 border-t border-swg-black/10 pt-2">
            <AnalyticsDateRangeFilter
              compact
              mode={mode}
              year={year}
              monthIndex={monthIndex}
              quarter={quarter}
              from={draftFrom}
              to={draftTo}
              disabled={loading}
              onModeChange={handleModeChange}
              onYearChange={setYear}
              onMonthChange={setMonthIndex}
              onQuarterChange={setQuarter}
              onFromChange={setDraftFrom}
              onToChange={setDraftTo}
              onApply={handleApplyRange}
              onShortcut={handleRangeShortcut}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 max-w-5xl flex-col gap-5 p-6 pt-5 font-text text-swg-black">
        {loadError ? (
          <p className="mt-4 text-base text-red-700" role="alert">
            {loadError}
          </p>
        ) : null}
        {loading && !summary ? (
          <p className="mt-6 text-base opacity-70">Lade…</p>
        ) : null}

        {summary ? (
          <>
            <section className={sectionPanelClass}>
              <h2
                className={`${analyticsSectionStickyHeaderClassName()} -mt-5 pt-5 font-display text-base font-bold`}
                style={analyticsSectionStickyHeaderStyle(sectionStickyTop)}
              >
                Übersicht
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <StatCard label="Unique Visitors" value={uniqueTotal} />
                <StatCard label="Sessions" value={sessionTotal} />
                <StatCard label="Alle Level fertig" value={allCompleteTotal} />
                <StatCard label="Level-Starts" value={levelTotal} />
                <StatCard label="Quiz-Antworten" value={quizTotal} />
              </div>
              {summary.levelStarts.length > 0 ? (
                <div className="mt-5 border-t border-swg-black/10 pt-4">
                  <h3 className="font-display text-base font-bold">
                    Top-Level
                  </h3>
                  <p className="mt-0.5 text-base opacity-60">
                    Meiste Starts im gewählten Zeitraum
                  </p>
                  <ol className="mt-3 flex flex-col gap-2 text-base">
                    {topLevelStarts.map((row, index) => (
                        <li
                          key={row.levelSlug}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span className="min-w-0 truncate">
                            <span className="mr-1.5 tabular-nums opacity-50">
                              {index + 1}.
                            </span>
                            {row.levelTitle || row.levelSlug}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {row.count}
                          </span>
                        </li>
                      ))}
                  </ol>
                </div>
              ) : null}
            </section>

            <section className={sectionPanelClass}>
              <AnalyticsDayTable
                stickyTop={sectionStickyTop}
                uniqueRows={days.uniqueVisitorsByDay}
                sessionRows={days.sessionsByDay}
                allCompleteRows={days.allLevelsCompleteByDay}
                daysTotal={days.daysTotal}
                hasMore={days.hasMore}
                loadingMore={loadingMore}
                onLoadMore={() => void handleLoadMore()}
              />
            </section>

            <section className={sectionPanelClass}>
              <AnalyticsCollapsibleSection
                title="Level-Starts"
                stickyTop={sectionStickyTop}
                meta={
                  levelStartCount === 0
                    ? "0 Level"
                    : `${levelStartCount} Level · ${levelTotal} Starts`
                }
              >
                {summary.levelStarts.length === 0 ? (
                  <p className="mt-2 text-base opacity-70">Noch keine Daten.</p>
                ) : (
                  <table className="mt-3 w-full border-collapse text-left text-base">
                    <thead>
                      <tr className="border-b border-swg-black/20">
                        <th className="py-2 pr-3 font-semibold">Level</th>
                        <th className="py-2 font-semibold">Starts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLevelStarts.map((row) => (
                        <tr
                          key={row.levelSlug}
                          className="border-b border-swg-black/10"
                        >
                          <td className="py-2 pr-3">
                            {row.levelTitle || row.levelSlug}
                          </td>
                          <td className="py-2">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </AnalyticsCollapsibleSection>
            </section>

            <section className={`${sectionPanelClass} mb-4`}>
              <AnalyticsCollapsibleSection
                title="Quiz-Antworten"
                defaultOpen={false}
                stickyTop={sectionStickyTop}
                meta={
                  quizLevelCount === 0
                    ? "0 Level"
                    : `${quizLevelCount} Level · ${quizTotal} Antworten`
                }
              >
                {summary.quizAnswers.length === 0 ? (
                  <p className="mt-2 text-base opacity-70">Noch keine Daten.</p>
                ) : (
                  <div className="mt-3">
                    <QuizAnswerBars
                      rows={summary.quizAnswers}
                      districts={districts}
                    />
                  </div>
                )}
              </AnalyticsCollapsibleSection>
            </section>
          </>
        ) : null}
      </div>
    </AnalyticsScrollShell>
  );
}

const sectionPanelClass =
  "rounded-lg border border-swg-black/10 bg-white p-5 shadow-sm";

const TOP_LEVELS_OVERVIEW = 5;

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-swg-black/10 bg-swg-black/[0.03] p-3">
      <p className="text-base uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-display text-base font-bold">{value}</p>
    </div>
  );
}
