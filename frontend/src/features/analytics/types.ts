/** Datenstrukturen für Statistikereignisse und Auswertung. */

export type AnalyticsTrackPayload =
  | { metric: "unique_visit"; day: string }
  | { metric: "session_start"; day: string }
  | { metric: "all_levels_complete"; day: string }
  | { metric: "level_start"; day: string; levelSlug: string }
  | {
      metric: "quiz_answer";
      day: string;
      levelSlug: string;
      answerIndex: number;
      isCorrect: boolean;
    };

export type AnalyticsDayCount = {
  day: string;
  count: number;
};

type AnalyticsLevelStartCount = {
  levelSlug: string;
  levelTitle: string;
  count: number;
};

export type AnalyticsQuizAnswerCount = {
  levelSlug: string;
  levelTitle: string;
  questionLabel: string;
  answerIndex: number;
  answerLabel: string;
  isCorrect: boolean;
  count: number;
};

type AnalyticsDaysPagination = {
  total: number;
  limit: number | null;
  offset: number;
  hasMore: boolean;
};

export type AnalyticsSummary = {
  uniqueVisitorsByDay: AnalyticsDayCount[];
  sessionsByDay: AnalyticsDayCount[];
  allLevelsCompleteByDay: AnalyticsDayCount[];
  uniqueVisitorsTotal: number;
  sessionsTotal: number;
  allLevelsCompleteTotal: number;
  levelStarts: AnalyticsLevelStartCount[];
  quizAnswers: AnalyticsQuizAnswerCount[];
  daysPagination?: AnalyticsDaysPagination;
};

type AnalyticsAuthUser = {
  id: number;
  username: string;
  email: string;
};

export type AnalyticsLoginResult = {
  jwt: string;
  user: AnalyticsAuthUser;
};

/** Antwort von POST /analytics/auth/login */
export type AnalyticsAuthLoginResponse =
  | { status: "totp_required"; challengeToken: string }
  | { status: "setup_required"; challengeToken: string };

/** Antwort nach erfolgreicher TOTP-Prüfung oder Einrichtung. */
export type AnalyticsAuthSuccessResponse = {
  status: "authenticated";
  jwt: string;
  user: AnalyticsAuthUser;
};

export type AnalyticsAuthSetupResponse = {
  status: "setup";
  challengeToken: string;
  otpauthUrl: string;
  qrDataUrl: string;
  secret: string;
};
