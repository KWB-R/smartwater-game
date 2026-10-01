import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/cn";
import { playSound } from "@/lib/sound/globalSound";

const DEFAULT_RAIN_PARTICLE_COUNT = 52;

/** Dichter Konfettieffekt im Vorher-Nachher-Vergleich. */
export const LEVEL_BEFORE_AFTER_CONFETTI_PARTICLE_COUNT = 84;

/** Nach diesem Zeitraum keine neuen Konfettipartikel starten. */
export const LEVEL_BEFORE_AFTER_CONFETTI_STOP_SPAWN_MS = 3_100;

const YELLOW_SHADES = ["#EBD650", "#FAEB69"] as const;
const PURPLE = "#9b23f7";

type ConfettiShape = "rect" | "circle";

type RainParticleSpec = {
  id: number;
  leftPct: number;
  w: number;
  h: number;
  rot: number;
  driftPx: number;
  delaySec: number;
  durationSec: number;
  color: (typeof YELLOW_SHADES)[number] | typeof PURPLE;
  shape: ConfettiShape;
};

/** Gestaffelt startende gelbe und violette Konfettipartikel. */
function buildRainParticles(count: number): RainParticleSpec[] {
  return Array.from({ length: count }, (_, id) => {
    const shape: ConfettiShape = Math.random() < 0.28 ? "circle" : "rect";
    const size = 10 + Math.random() * 14;
    const h = shape === "circle" ? size : 9 + Math.random() * 11;
    const w = shape === "circle" ? size : 18 + Math.random() * 28;
    // Etwa ein Fünftel violett; die Farbe ist unabhängig von der Form.
    const color =
      Math.random() < 0.2
        ? PURPLE
        : YELLOW_SHADES[Math.floor(Math.random() * YELLOW_SHADES.length)]!;

    return {
      id,
      leftPct: Math.random() * 100,
      w,
      h,
      rot: -50 + Math.random() * 100,
      driftPx: (Math.random() - 0.5) * 160,
      delaySec: Math.random() * 2.9,
      durationSec: 1.9 + Math.random() * 1.0,
      color,
      shape,
    };
  });
}

function latestFinishMs(
  particles: RainParticleSpec[],
  stopSpawnMs: number,
): number {
  let latest = stopSpawnMs;
  for (const p of particles) {
    const delayMs = p.delaySec * 1000;
    if (delayMs >= stopSpawnMs) {
      continue;
    }
    latest = Math.max(latest, delayMs + p.durationSec * 1000);
  }
  return latest;
}

type LevelWinConfettiProps = {
  active: boolean;
  reducedMotion?: boolean;
  /**
   * Stoppt neue Partikel nach der angegebenen Zeit; laufende Partikel fallen zu Ende.
   * Ohne Wert läuft der Effekt dauerhaft.
   */
  stopSpawningAfterMs?: number;
  /**
   * Stoppt neue Partikel von außen, ohne den Effekt zurückzusetzen.
   * Bereits gestartete Partikel fallen zu Ende.
   */
  stopSpawning?: boolean;
  particleCount?: number;
  /** Standardmäßig mit Jubelsound; das Kartenintro bleibt ohne diesen Sound. */
  playCelebrationSound?: boolean;
};

/** Gelb/lila Konfetti-Burst (Karten-Intro / Vorher-Nachher). */
export function LevelWinConfetti({
  active,
  reducedMotion = false,
  stopSpawningAfterMs,
  stopSpawning = false,
  particleCount = DEFAULT_RAIN_PARTICLE_COUNT,
  playCelebrationSound = true,
}: LevelWinConfettiProps) {
  const particles = useMemo(
    () => buildRainParticles(particleCount),
    [particleCount],
  );
  const [showRain, setShowRain] = useState(false);
  const [spawnStopped, setSpawnStopped] = useState(false);
  const [spawnStopElapsedMs, setSpawnStopElapsedMs] = useState(0);
  const sessionRef = useRef(0);
  const startedAtRef = useRef(0);

  const finiteRain =
    (stopSpawningAfterMs != null && stopSpawningAfterMs > 0) || stopSpawning;

  useEffect(() => {
    if (!active || reducedMotion) {
      setShowRain(false);
      setSpawnStopped(false);
      setSpawnStopElapsedMs(0);
      return;
    }

    const session = ++sessionRef.current;
    startedAtRef.current = performance.now();
    setShowRain(true);
    setSpawnStopped(false);
    setSpawnStopElapsedMs(0);
    if (playCelebrationSound) {
      playSound("celebration.yay");
    }

    if (stopSpawningAfterMs == null || stopSpawningAfterMs <= 0) {
      return;
    }

    const stopMs = stopSpawningAfterMs;
    const stopTimerId = window.setTimeout(() => {
      if (sessionRef.current !== session) {
        return;
      }
      setSpawnStopped(true);
      setSpawnStopElapsedMs(stopMs);
    }, stopMs);

    const hideTimerId = window.setTimeout(
      () => {
        if (sessionRef.current !== session) {
          return;
        }
        setShowRain(false);
      },
      latestFinishMs(particles, stopMs),
    );

    return () => {
      window.clearTimeout(stopTimerId);
      window.clearTimeout(hideTimerId);
    };
  }, [
    active,
    reducedMotion,
    stopSpawningAfterMs,
    particles,
    playCelebrationSound,
  ]);

  useEffect(() => {
    if (!active || reducedMotion || !showRain || !stopSpawning) {
      return;
    }
    const session = sessionRef.current;
    const elapsed = Math.max(0, performance.now() - startedAtRef.current);
    setSpawnStopped(true);
    setSpawnStopElapsedMs(elapsed);

    const hideAfterMs = latestFinishMs(particles, elapsed) - elapsed;
    const hideTimerId = window.setTimeout(
      () => {
        if (sessionRef.current !== session) {
          return;
        }
        setShowRain(false);
      },
      Math.max(0, hideAfterMs),
    );

    return () => {
      window.clearTimeout(hideTimerId);
    };
  }, [active, reducedMotion, showRain, stopSpawning, particles]);

  if (!showRain || reducedMotion) {
    return null;
  }

  const cancelAfterMs = spawnStopped
    ? spawnStopElapsedMs
    : (stopSpawningAfterMs ?? 0);

  return (
    <div
      className={cn(
        "level-win-confetti-rain h-full w-full",
        finiteRain && "level-win-confetti-rain--finite",
      )}
      aria-hidden
    >
      {particles.map((p) => {
        const delayMs = p.delaySec * 1000;
        const cancelled =
          spawnStopped && finiteRain && delayMs >= cancelAfterMs;

        return (
          <div
            key={p.id}
            className={cn(
              "level-win-confetti-rain__particle",
              p.shape === "circle" &&
                "level-win-confetti-rain__particle--circle",
              cancelled && "level-win-confetti-rain__particle--cancelled",
            )}
            style={
              {
                left: `${p.leftPct}%`,
                width: p.w,
                height: p.h,
                marginLeft: -p.w / 2,
                "--cf-color": p.color,
                "--cf-rot": `${p.rot}deg`,
                "--cf-drift": `${p.driftPx}px`,
                "--cf-delay": `${p.delaySec}s`,
                "--cf-duration": `${p.durationSec}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
