import { describe, expect, it } from "vitest";
import { SOUND_REGISTRY } from "@/lib/sound/soundRegistry";
import { SOUND_IDS } from "@/lib/sound/soundTypes";
import type { GeneratedSoundDefinition } from "@/lib/sound/soundTypes";

function expectGeneratedSound(definition: GeneratedSoundDefinition): void {
  expect(definition.steps.length).toBeGreaterThan(0);
  for (const step of definition.steps) {
    expect(step.frequency).toBeGreaterThan(0);
    expect(step.durationMs).toBeGreaterThan(0);
  }
}

describe("SOUND_REGISTRY", () => {
  it("defines every public sound id", () => {
    expect(Object.keys(SOUND_REGISTRY).sort()).toEqual([...SOUND_IDS].sort());
  });

  it("keeps generated fallbacks playable", () => {
    for (const definition of Object.values(SOUND_REGISTRY)) {
      if (definition.kind === "file") {
        expect(definition.src).toMatch(/\.mp3(?:[?#].*)?$/i);
        expectGeneratedSound(definition.fallback);
      } else {
        expectGeneratedSound(definition);
      }
    }
  });
});
