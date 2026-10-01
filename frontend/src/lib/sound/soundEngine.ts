import { SOUND_REGISTRY } from "@/lib/sound/soundRegistry";
import type {
  FileSoundDefinition,
  GeneratedSoundDefinition,
  GeneratedSoundStep,
  PlaySoundOptions,
  SoundId,
} from "@/lib/sound/soundTypes";

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const DEFAULT_ATTACK_MS = 3;
const DEFAULT_RELEASE_MS = 35;
const MIN_GAIN = 0.0001;

/** Kurzes PCM-WAV — HTMLAudio-Unlock (iOS), parallel zu Web Audio. */
function silentWavDataUri(): string {
  const sampleCount = 256;
  const dataBytes = sampleCount * 2;
  const byteLength = 44 + dataBytes;
  const bytes = new Uint8Array(byteLength);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      bytes[offset + i] = text.charCodeAt(i);
    }
  };
  write(0, "RIFF");
  view.setUint32(4, byteLength - 8, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8_000, true);
  view.setUint32(28, 16_000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataBytes, true);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

/** Ohne direkte Nutzeraktion ausgelöste Sounds bei pausiertem Audiokontext überspringen. */
const NO_SUSPENDED_QUEUE: ReadonlySet<SoundId> = new Set(["celebration.yay"]);

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 1;
  }
  return Math.max(0, Math.min(1, volume));
}

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (
    window.AudioContext ??
    (window as AudioContextWindow).webkitAudioContext ??
    null
  );
}

function stepEndMs(step: GeneratedSoundStep): number {
  return (step.delayMs ?? 0) + step.durationMs;
}

function fileSoundIds(): SoundId[] {
  return (Object.keys(SOUND_REGISTRY) as SoundId[]).filter(
    (id) => SOUND_REGISTRY[id].kind === "file",
  );
}

class SoundEngine {
  private context: AudioContext | null = null;
  /** Dekodierte Audiodateien; nach dem Entsperren auch aus Timern abspielbar. */
  private readonly bufferCache = new Map<SoundId, AudioBuffer>();
  private readonly bufferLoads = new Map<SoundId, Promise<AudioBuffer | null>>();
  private htmlUnlock: HTMLAudioElement | null = null;
  /** Unterdrückt doppelte Aufrufe durch mehrere Listener oder Zeigerereignisse. */
  private lastPlayId: SoundId | null = null;
  private lastPlayAt = 0;

  play(id: SoundId, options: PlaySoundOptions = {}): void {
    const definition = SOUND_REGISTRY[id];
    if (!definition) {
      return;
    }

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (id === this.lastPlayId && now - this.lastPlayAt < 50) {
      return;
    }
    this.lastPlayId = id;
    this.lastPlayAt = now;

    if (definition.kind === "file") {
      this.playFile(id, definition, options);
      return;
    }

    this.playGenerated(definition, options);
  }

  /**
   * Bereitet Web Audio und HTMLAudio während einer Nutzeraktion vor.
   * Auf dem iPhone ist zusätzlich ein echter play()-Aufruf aus SoundProvider nötig.
   */
  prime(): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    this.resumeContext(context);

    try {
      if (!this.htmlUnlock) {
        this.htmlUnlock = new Audio(silentWavDataUri());
        this.htmlUnlock.setAttribute("playsinline", "true");
        this.htmlUnlock.preload = "auto";
      }
      const html = this.htmlUnlock;
      html.currentTime = 0;
      void html
        .play()
        .then(() => {
          html.pause();
        })
        .catch(() => {});
    } catch {
      /* Fehlendes HTMLAudio verhindert das weitere Vorbereiten von Web Audio nicht. */
    }

    for (const id of fileSoundIds()) {
      void this.loadBuffer(id);
    }
  }

  isContextRunning(): boolean {
    return this.context?.state === "running";
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      return null;
    }

    this.context = new AudioContextConstructor();
    return this.context;
  }

  private resumeContext(context: AudioContext): void {
    if (context.state === "suspended") {
      void context.resume().catch(() => {});
    }
  }

  private loadBuffer(id: SoundId): Promise<AudioBuffer | null> {
    const cached = this.bufferCache.get(id);
    if (cached) {
      return Promise.resolve(cached);
    }

    const inflight = this.bufferLoads.get(id);
    if (inflight) {
      return inflight;
    }

    const definition = SOUND_REGISTRY[id];
    if (!definition || definition.kind !== "file") {
      return Promise.resolve(null);
    }

    const load = (async (): Promise<AudioBuffer | null> => {
      const context = this.getContext();
      if (!context) {
        return null;
      }
      try {
        const response = await fetch(definition.src);
        if (!response.ok) {
          return null;
        }
        const bytes = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(bytes.slice(0));
        this.bufferCache.set(id, buffer);
        return buffer;
      } catch {
        return null;
      } finally {
        this.bufferLoads.delete(id);
      }
    })();

    this.bufferLoads.set(id, load);
    return load;
  }

  private playFile(
    id: SoundId,
    definition: FileSoundDefinition,
    options: PlaySoundOptions,
  ): void {
    const cached = this.bufferCache.get(id);
    if (cached) {
      this.playBuffer(id, cached, definition.volume, options);
      return;
    }

    void this.loadBuffer(id).then((buffer) => {
      if (buffer) {
        this.playBuffer(id, buffer, definition.volume, options);
        return;
      }
      this.playGenerated(definition.fallback, options);
    });
  }

  private playBuffer(
    id: SoundId,
    buffer: AudioBuffer,
    definitionVolume: number | undefined,
    options: PlaySoundOptions,
  ): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    // Sounds bei pausiertem Kontext überspringen, damit sie nicht beim nächsten Entsperren verspätet starten.
    if (NO_SUSPENDED_QUEUE.has(id) && context.state !== "running") {
      this.resumeContext(context);
      void context
        .resume()
        .then(() => {
          if (context.state === "running") {
            this.startBuffer(context, buffer, definitionVolume, options);
          }
        })
        .catch(() => {});
      return;
    }

    this.resumeContext(context);
    this.startBuffer(context, buffer, definitionVolume, options);
  }

  private startBuffer(
    context: AudioContext,
    buffer: AudioBuffer,
    definitionVolume: number | undefined,
    options: PlaySoundOptions,
  ): void {
    const source = context.createBufferSource();
    const gain = context.createGain();
    const volume = clampVolume((definitionVolume ?? 1) * (options.volume ?? 1));
    source.buffer = buffer;
    source.playbackRate.value = options.playbackRate ?? 1;
    gain.gain.setValueAtTime(volume, context.currentTime);
    source.connect(gain);
    gain.connect(context.destination);
    source.start(context.currentTime);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  private playGenerated(
    definition: GeneratedSoundDefinition,
    options: PlaySoundOptions,
  ): void {
    const context = this.getContext();
    if (!context) {
      return;
    }

    this.resumeContext(context);

    const baseVolume = clampVolume(
      (definition.volume ?? 1) * (options.volume ?? 1),
    );
    const totalDurationMs = Math.max(...definition.steps.map(stepEndMs), 1);
    const master = context.createGain();
    master.gain.setValueAtTime(baseVolume, context.currentTime);
    master.connect(context.destination);

    for (const step of definition.steps) {
      this.scheduleStep(context, master, step);
    }

    window.setTimeout(() => master.disconnect(), totalDurationMs + 80);
  }

  private scheduleStep(
    context: AudioContext,
    master: GainNode,
    step: GeneratedSoundStep,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const delaySeconds = (step.delayMs ?? 0) / 1000;
    const durationSeconds = Math.max(step.durationMs, 1) / 1000;
    const startAt = context.currentTime + delaySeconds;
    const endAt = startAt + durationSeconds;
    const attackSeconds = (step.attackMs ?? DEFAULT_ATTACK_MS) / 1000;
    const releaseSeconds = (step.releaseMs ?? DEFAULT_RELEASE_MS) / 1000;
    const sustainAt = Math.min(startAt + attackSeconds, endAt);
    const releaseAt = Math.max(sustainAt, endAt - releaseSeconds);
    const stepVolume = clampVolume(step.volume ?? 1);

    oscillator.type = step.type ?? "sine";
    oscillator.frequency.setValueAtTime(step.frequency, startAt);
    oscillator.detune.setValueAtTime(step.detuneCents ?? 0, startAt);

    gain.gain.setValueAtTime(MIN_GAIN, startAt);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(stepVolume, MIN_GAIN),
      sustainAt,
    );
    gain.gain.setValueAtTime(Math.max(stepVolume, MIN_GAIN), releaseAt);
    gain.gain.exponentialRampToValueAtTime(MIN_GAIN, endAt);

    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.01);
  }
}

export const soundEngine = new SoundEngine();
