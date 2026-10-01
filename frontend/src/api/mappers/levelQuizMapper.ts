import { mapBlocksField } from "@/api/mappers/blocksMapper";
import {
  normalizeStrapiDocument,
  readStrapiComponentList,
  unwrapStrapiRelation,
} from "@/api/schemas/strapiCommon";
import type { DistrictLevelQuiz, DistrictLevelQuizAnswer } from "@/types/content";

type AnswerDto = {
  id?: number | string;
  content?: unknown;
  correctAnswer?: boolean;
  correct_answer?: boolean;
};

type QuestionDto = {
  id?: number | string;
  content?: unknown;
  answers?: unknown;
};

function coerceBoolean(value: unknown): boolean {
  if (value === true || value === false) return value;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return false;
}

function answerId(entry: AnswerDto, index: number): number {
  if (typeof entry.id === "number" && Number.isFinite(entry.id)) {
    return entry.id;
  }
  if (typeof entry.id === "string") {
    const n = Number(entry.id);
    if (Number.isFinite(n)) return n;
  }
  return index + 1;
}

function mapAnswer(entry: AnswerDto, index: number): DistrictLevelQuizAnswer {
  const correctRaw =
    entry.correctAnswer ?? entry.correct_answer ?? false;
  return {
    id: answerId(entry, index),
    content: mapBlocksField(entry.content),
    correctAnswer: coerceBoolean(correctRaw),
  };
}

function mapQuestion(dto: QuestionDto): DistrictLevelQuiz | null {
  const answersRaw = readStrapiComponentList(dto.answers);
  const answers: DistrictLevelQuizAnswer[] = [];
  for (let i = 0; i < answersRaw.length; i++) {
    const entry = normalizeStrapiDocument<AnswerDto>(answersRaw[i]);
    if (!entry) continue;
    answers.push(mapAnswer(entry, i));
  }
  if (answers.length === 0) {
    return null;
  }
  return {
    question: mapBlocksField(dto.content),
    answers,
  };
}

export function readLevelQuizRaw(level: Record<string, unknown>): unknown {
  return level.quiz ?? null;
}

/** Quizfrage aus der einzelnen Strapi-Komponente object.question am Level. */
export function mapLevelQuiz(value: unknown): DistrictLevelQuiz | null {
  const unwrapped =
    normalizeStrapiDocument<QuestionDto>(value) ??
    unwrapStrapiRelation<QuestionDto>(value);
  if (!unwrapped || typeof unwrapped !== "object") {
    return null;
  }
  return mapQuestion(unwrapped);
}
