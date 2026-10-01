import type { CSSProperties } from "react";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { KronenIcon } from "@/internal_assets/icons/KronenIcon";
import { QuizCorrectArrowIcon } from "@/internal_assets/icons/QuizCorrectArrowIcon";
import { QuizWrongArrowIcon } from "@/internal_assets/icons/QuizWrongArrowIcon";
import { cn } from "@/lib/cn";
import type { DistrictLevelQuiz } from "@/types/content";

const QUIZ_ANSWER_CORRECT_SURFACE = "var(--color-swg-green)";
const QUIZ_ANSWER_WRONG_SURFACE = "var(--color-swg-purple)";

function quizAnswerSurfaceStyle(color: string): CSSProperties {
  return {
    backgroundColor: color,
    borderColor: color,
  };
}

const QUIZ_ANSWER_STRAPI_SURFACE_RESET =
  "[&_.strapi-blocks-view]:!border-0 [&_.strapi-blocks-view]:!bg-transparent [&_.strapi-blocks-view]:!shadow-none";

export type QuizViewPhase = "select" | "feedback";

type QuizViewProps = {
  quiz: DistrictLevelQuiz;
  phase: QuizViewPhase;
  selectedAnswerId: number | null;
  onSelectAnswer: (answerId: number) => void;
  reducedMotion?: boolean;
};

const ANSWER_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function answerLetter(index: number): string {
  return ANSWER_LETTERS[index] ?? String(index + 1);
}

export function QuizView({
  quiz,
  phase,
  selectedAnswerId,
  onSelectAnswer,
}: QuizViewProps) {
  const feedbackLocked = phase === "feedback";
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-auto px-4 pb-4 pt-3">
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-1.5 font-text text-xs font-semibold uppercase tracking-wide text-swg-black">
          <span className="inline-flex h-6 w-6 shrink-0" aria-hidden>
            <KronenIcon />
          </span>
          <span>Hol dir die Krone!</span>
        </div>
        <h1
          id="quiz-sheet-title"
          className="font-text text-[1.375rem] font-bold leading-tight text-swg-black"
        >
          Schwammtastisches Quiz
        </h1>
      </div>

      <section className="relative min-h-[14rem] flex-1" aria-label="Quizfrage">
        <div className="relative z-0 mb-4 font-text text-xl leading-snug text-swg-black">
          <StrapiBlocksView
            blocks={quiz.question}
            emptyLabel="Keine Quizfrage hinterlegt."
          />
        </div>

        <ul className="relative z-0 m-0 list-none space-y-2.5 p-0">
          {quiz.answers.map((answer, index) => {
            const letter = answerLetter(index);
            const isSelected = selectedAnswerId === answer.id;
            const showCorrectStyle = feedbackLocked && answer.correctAnswer;
            const showWrongSelected =
              feedbackLocked && isSelected && !answer.correctAnswer;

            const hasFeedbackSurface = showCorrectStyle || showWrongSelected;
            const cardStyle: CSSProperties | undefined = showCorrectStyle
              ? quizAnswerSurfaceStyle(QUIZ_ANSWER_CORRECT_SURFACE)
              : showWrongSelected
                ? quizAnswerSurfaceStyle(QUIZ_ANSWER_WRONG_SURFACE)
                : undefined;

            return (
              <li key={answer.id}>
                <button
                  type="button"
                  disabled={feedbackLocked}
                  onClick={() => onSelectAnswer(answer.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors disabled:cursor-default",
                    !hasFeedbackSurface &&
                      (isSelected && !feedbackLocked
                        ? "border-swg-green bg-white"
                        : "border-transparent bg-white"),
                  )}
                  style={cardStyle}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      hasFeedbackSurface
                        ? "bg-white"
                        : "bg-swg-blue-dark font-text text-lg text-white",
                    )}
                    aria-hidden
                  >
                    {showCorrectStyle ? (
                      <QuizCorrectArrowIcon />
                    ) : showWrongSelected ? (
                      <QuizWrongArrowIcon />
                    ) : (
                      letter
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 font-text text-base leading-snug text-swg-black",
                      hasFeedbackSurface && QUIZ_ANSWER_STRAPI_SURFACE_RESET,
                      showWrongSelected &&
                        "text-white [&_*]:text-white [&_a]:text-white",
                      "pointer-events-none [&_a]:pointer-events-none",
                    )}
                  >
                    <StrapiBlocksView blocks={answer.content} emptyLabel="—" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
