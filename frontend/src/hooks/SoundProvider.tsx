import {
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import {
  isSoundContextRunning,
  playSound,
  primeSound,
} from "@/lib/sound/globalSound";
import { SOUND_IDS, type PlaySoundOptions, type SoundId } from "@/lib/sound/soundTypes";
import {
  SoundContext,
  type SoundContextValue,
} from "@/hooks/soundContext";

const soundIdSet = new Set<string>(SOUND_IDS);

/** Erkennt native Schaltflächen, data-sound, ARIA-Schaltflächen und summary-Elemente. */
const SOUND_TARGET_SELECTOR =
  "button, [data-sound], [role='button'], summary";

function isSoundId(value: string): value is SoundId {
  return soundIdSet.has(value);
}

function findSoundTarget(target: EventTarget | null): Element | null {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  if (!element) {
    return null;
  }
  return element.closest(SOUND_TARGET_SELECTOR);
}

function isInteractionDisabled(element: Element): boolean {
  if (element instanceof HTMLButtonElement && element.disabled) {
    return true;
  }
  if (element.getAttribute("aria-disabled") === "true") {
    return true;
  }
  return false;
}

function soundIdForElement(element: Element): SoundId | null {
  const configured = element.getAttribute("data-sound");
  if (configured === "none") {
    return null;
  }
  if (isInteractionDisabled(element)) {
    return null;
  }
  if (configured && isSoundId(configured)) {
    return configured;
  }
  if (element.matches("button, [role='button'], summary")) {
    return "button.click";
  }
  return null;
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const play = useCallback((id: SoundId, options?: PlaySoundOptions) => {
    playSound(id, options);
  }, []);

  useEffect(() => {
    /**
     * Nur pointerdown verwenden, damit iOS keine doppelte Rückmeldung durch touchstart auslöst.
     * Außerhalb von Schaltflächen den Audiokontext nur einmal pro Sitzung entsperren.
     */
    let unlockClickPlayed = false;
    let lastUiSoundId: SoundId | null = null;
    let lastUiSoundAt = 0;

    const handlePointerDown = (event: PointerEvent) => {
      // Nur die primäre Berührung oder linke Maustaste berücksichtigen.
      if (typeof event.button === "number" && event.button !== 0) {
        return;
      }

      primeSound();

      const element = findSoundTarget(event.target);
      const id = element ? soundIdForElement(element) : null;

      if (id) {
        const now = Date.now();
        if (id === lastUiSoundId && now - lastUiSoundAt < 100) {
          return;
        }
        lastUiSoundId = id;
        lastUiSoundAt = now;
        unlockClickPlayed = true;
        play(id);
        return;
      }

      // Beim Ziehen nur einmal entsperren, ohne bei jeder Berührung einen Klicksound zu spielen.
      if (unlockClickPlayed || isSoundContextRunning()) {
        return;
      }
      unlockClickPlayed = true;
      play("button.click");
    };

    document.addEventListener("pointerdown", handlePointerDown, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [play]);

  const value = useMemo<SoundContextValue>(() => ({ playSound: play }), [play]);

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}
