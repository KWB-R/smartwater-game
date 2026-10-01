import {
  QuizView,
  type QuizViewPhase,
} from "@/components/features/level/QuizView";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { DistrictLevelQuiz } from "@/types/content";

type LevelQuizSheetProps = {
  quiz: DistrictLevelQuiz;
  open: boolean;
  reducedMotion: boolean;
  phase: QuizViewPhase;
  selectedAnswerId: number | null;
  onSelectAnswer: (id: number | null) => void;
  onSubmitAnswer: () => void;
  /** Nach Feedback („weiter“) — schließt das Quiz ab. */
  onContinue: () => void;
  /** Nach vollständiger Einblendung des Quiz-Sheets die Vergleichsansicht darunter entfernen. */
  onEntered: () => void;
};

/** Quiz als Bottom-Sheet: Frage/Antworten plus phasenabhängiger Footer. */
export function LevelQuizSheet({
  quiz,
  open,
  reducedMotion,
  phase,
  selectedAnswerId,
  onSelectAnswer,
  onSubmitAnswer,
  onContinue,
  onEntered,
}: LevelQuizSheetProps) {
  const footer =
    phase === "select" ? (
      <div className="flex justify-center gap-3 px-4 py-[0.85rem]">
        <Button
          grow
          className="max-w-md"
          disabled={selectedAnswerId == null}
          onClick={onSubmitAnswer}
        >
          Antwort einloggen
        </Button>
      </div>
    ) : (
      <div className="flex justify-center gap-3 px-4 py-[0.85rem]">
        <Button grow className="max-w-md" onClick={onContinue}>
          weiter
        </Button>
      </div>
    );

  return (
    <BottomSheet
      open={open}
      reducedMotion={reducedMotion}
      labelledBy="quiz-sheet-title"
      onEntered={onEntered}
      footer={footer}
    >
      <QuizView
        quiz={quiz}
        phase={phase}
        selectedAnswerId={selectedAnswerId}
        onSelectAnswer={onSelectAnswer}
      />
    </BottomSheet>
  );
}
