import { trackAnalyticsEvent } from "@/api/services/analyticsService";
import { utcDayKey } from "@/features/analytics/visitDayKey";

/** Quiz-Antwort (aggregiert serverseitig). */
export function trackQuizAnswer(input: {
  levelSlug: string;
  answerIndex: number;
  isCorrect: boolean;
}): void {
  const levelSlug = input.levelSlug.trim();
  if (!levelSlug || input.answerIndex < 0) {
    return;
  }
  void trackAnalyticsEvent({
    metric: "quiz_answer",
    day: utcDayKey(),
    levelSlug,
    answerIndex: input.answerIndex,
    isCorrect: input.isCorrect,
  });
}
