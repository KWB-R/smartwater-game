import { createContext } from "react";
import type { PlaySoundOptions, SoundId } from "@/lib/sound/soundTypes";

export type SoundContextValue = {
  playSound: (id: SoundId, options?: PlaySoundOptions) => void;
};

export const SoundContext = createContext<SoundContextValue | null>(null);
