import { soundEngine } from "@/lib/sound/soundEngine";
import type { PlaySoundOptions, SoundId } from "@/lib/sound/soundTypes";

export function playSound(id: SoundId, options?: PlaySoundOptions): void {
  soundEngine.play(id, options);
}

export function primeSound(): void {
  soundEngine.prime();
}

/** true, wenn der Web-Audio-Kontext bereits entsperrt ist. */
export function isSoundContextRunning(): boolean {
  return soundEngine.isContextRunning();
}
