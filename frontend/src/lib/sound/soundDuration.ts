import { SOUND_REGISTRY } from "@/lib/sound/soundRegistry";
import type {
  GeneratedSoundDefinition,
  GeneratedSoundStep,
  SoundDefinition,
  SoundId,
} from "@/lib/sound/soundTypes";

function stepEndMs(step: GeneratedSoundStep): number {
  return (step.delayMs ?? 0) + step.durationMs;
}

function generatedDurationMs(definition: GeneratedSoundDefinition): number {
  return Math.max(...definition.steps.map(stepEndMs), 1);
}

function definitionDurationMs(definition: SoundDefinition): number {
  if (definition.kind === "file") {
    return generatedDurationMs(definition.fallback);
  }
  return generatedDurationMs(definition);
}

/** Hörbare Dauer eines registrierten Sounds aus Synthese oder Audiodatei. */
export function getSoundDurationMs(id: SoundId): number {
  const definition = SOUND_REGISTRY[id];
  if (!definition) {
    return 0;
  }
  return definitionDurationMs(definition);
}
