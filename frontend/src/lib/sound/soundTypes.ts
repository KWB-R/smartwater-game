export const SOUND_IDS = [
  "button.click",
  "puzzle.pickup",
  "puzzle.place",
  "puzzle.invalid",
  "points.collect",
  "bonus.unlock",
  "bonus.unlock.map",
  "bonus.unlock.short",
  "quiz.correct",
  "quiz.wrong",
  "celebration.yay",
] as const;

export type SoundId = (typeof SOUND_IDS)[number];

export type GeneratedSoundStep = {
  frequency: number;
  durationMs: number;
  type?: OscillatorType;
  volume?: number;
  attackMs?: number;
  releaseMs?: number;
  delayMs?: number;
  detuneCents?: number;
};

export type GeneratedSoundDefinition = {
  kind: "generated";
  volume?: number;
  steps: readonly GeneratedSoundStep[];
};

export type FileSoundDefinition = {
  kind: "file";
  src: string;
  volume?: number;
  fallback: GeneratedSoundDefinition;
};

export type SoundDefinition =
  | GeneratedSoundDefinition
  | FileSoundDefinition;

export type PlaySoundOptions = {
  volume?: number;
  playbackRate?: number;
};
