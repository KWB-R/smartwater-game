import { useEffect, useMemo, type CSSProperties } from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import { cn } from "@/lib/cn";
import { getAppViewportElement } from "@/lib/appViewport";
import { OverlayPortal } from "@/components/ui/OverlayPortal";

export type PlacementParticleEndScatter = {
  /**
   * Maximaler Rückversatz entlang der Flugrichtung in Pixeln; die Balkenspitze bleibt die Grenze.
   */
  alongMax: number;
  /** Maximale seitliche Abweichung am Ziel in Pixeln. */
  perpMax: number;
};

/** Verteilt die Landepunkte im neu gefüllten Balkenabschnitt. */
export type PlacementParticleFillAbsorb = {
  /** Breite des neu gefüllten Balkenabschnitts in Pixeln. */
  fillDeltaPx: number;
  barHalfHeight: number;
  /** Dauer der Balkenanimation in Millisekunden. */
  fillDurationMs?: number;
  /** Verzögerung zwischen Partikelstart und Balkenwachstum in Millisekunden. */
  fillStartDelayMs?: number;
};

export type PlacementParticleBurstProps = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Skaliert die Partikelzahl anhand des Punktezuwachses. */
  intensity?: number;
  /** Zufällige Streuung um den Zielpunkt. */
  endScatter?: PlacementParticleEndScatter;
  /** Verteilt die Landepunkte innerhalb des neuen Balkenabschnitts. */
  fillAbsorb?: PlacementParticleFillAbsorb;
  mode?: "placement" | "explosion";
  /** Rendert die Explosion im Elternelement hinter den Overlays. */
  embedded?: boolean;
  /** Langsamere Explosion mit größerer Reichweite für Bonus- und Kombihinweise. */
  celebration?: boolean;
  /** Langsamere Flugbahn mit stärkerer Streuung nach einem Missionsbonus. */
  relaxedFlight?: boolean;
  /** Reichweite der Explosion in Pixeln. */
  explosionSpreadPx?: number;
  onComplete?: () => void;
};

/** Partikel haben dieselbe Höhe und unterschiedliche Längen. */
type ParticleVariant = "circle" | "short" | "long";

type ParticleSpec = {
  id: number;
  variant: ParticleVariant;
  w: number;
  h: number;
  /** Richtet die Längsachse ohne zusätzliche Drehung zum Punktebalken aus. */
  rot: string;
  delay: number;
  duration: number;
  /** Seitlicher Versatz quer zur Flugrichtung. */
  ox: number;
  oy: number;
  /** Landepunkt innerhalb des Balkens, relativ zum Anker. */
  ex: number;
  ey: number;
};

type ExplosionParticleSpec = {
  id: number;
  variant: ParticleVariant;
  w: number;
  h: number;
  rot: string;
  delay: number;
  duration: number;
  ox: number;
  oy: number;
  ex: number;
  ey: number;
};

function pickVariant(): ParticleVariant {
  const r = Math.random();
  if (r < 0.28) return "circle";
  if (r < 0.62) return "short";
  return "long";
}

function buildParticles(
  intensity: number,
  dx: number,
  dy: number,
  endScatter: PlacementParticleEndScatter,
  relaxedFlight = false,
  fillAbsorb?: PlacementParticleFillAbsorb,
): ParticleSpec[] {
  const clamped = Math.min(28, Math.max(8, intensity));

  const n = Math.min(40, Math.max(12, Math.round(6 + clamped * 1.15)));
  /** Partikelhöhe in Pixeln; steigt leicht mit der Intensität. */
  const baseH = Math.min(4.8, 3.1 + clamped * 0.05);
  /** Die Kapsellänge steigt mit der Intensität. */
  const lengthScale = 0.75 + (clamped / 28) * 0.4;
  /** Mehr Punkte verlängern die Flugdauer leicht. */
  const fillMs = fillAbsorb?.fillDurationMs ?? 520;
  const durationBase = fillAbsorb
    ? fillMs * 0.92
    : relaxedFlight
      ? 680
      : 480 + clamped * 6;
  const durationJitter = fillAbsorb ? fillMs * 0.12 : relaxedFlight ? 340 : 220;

  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;

  const px = -ny;
  const py = nx;

  /** Mindestbreite der Streuung für kleine Punktezuwächse. */
  const fillSpan = fillAbsorb
    ? Math.max(fillAbsorb.fillDeltaPx, Math.min(28, baseH * 5))
    : 0;

  return Array.from({ length: n }, (_, i) => {
    const variant = pickVariant();
    const h = baseH;
    let w: number;
    if (variant === "circle") {
      w = h;
    } else if (variant === "short") {
      w = h * (2.2 + Math.random() * 0.9) * lengthScale;
    } else {
      w = h * (4.8 + Math.random() * 1.4) * lengthScale;
    }

    /* Parallel anfliegende Partikel erst kurz vor der Landung zusammenführen. */
    const laneMax = fillAbsorb
      ? relaxedFlight
        ? 5
        : 3
      : relaxedFlight
        ? 11
        : 7;
    const lane = Math.floor(Math.random() * (laneMax * 2 + 1)) - laneMax;
    const rowGapPx = Math.max(
      6,
      baseH * (fillAbsorb ? 1.35 : relaxedFlight ? 2.8 : 2),
    );
    const perp = lane * rowGapPx + (Math.random() - 0.5) * (rowGapPx * 0.35);
    const ox = px * perp;
    const oy = py * perp;

    let ex: number;
    let ey: number;
    let delay: number;
    let duration: number;

    if (fillAbsorb && fillSpan > 0) {
      /**
       * Die Landepunkte folgen dem wachsenden Balken von der alten zur neuen Spitze.
       * Alle Partikel bleiben innerhalb der Balkenhöhe und hinter der aktuellen Spitze.
       */
      const t = Math.random();
      const tipPull = Math.max(w * 0.4, baseH * 1.1);
      const alongIntoFill = (1 - t) * fillSpan + tipPull * 0.5 + Math.random() * 3;
      ex = -alongIntoFill;
      const maxEy = Math.max(0.5, fillAbsorb.barHalfHeight * 0.5 - h * 0.35);
      ey = (Math.random() - 0.5) * 2 * maxEy;
      duration = durationBase + Math.random() * durationJitter;
      const fillStart = fillAbsorb.fillStartDelayMs ?? 0;
      const arrivalMs = fillStart + t * fillMs;
      delay = Math.max(0, arrivalMs - duration * 0.88);
    } else {
      /* Die Streuung auf den Bereich innerhalb des Balkens begrenzen. */
      const tipPull = Math.max(w * 0.4, baseH * 1.1);
      const alongJ = -(Math.random() * endScatter.alongMax + tipPull * 0.45);
      const maxPerp = Math.max(0.5, endScatter.perpMax * 0.55 - h * 0.35);
      const perpJ = (Math.random() - 0.5) * 2 * maxPerp;
      ex = nx * alongJ + px * perpJ;
      ey = ny * alongJ + py * perpJ;
      delay = Math.random() * (relaxedFlight ? 150 : 95);
      duration = durationBase + Math.random() * durationJitter;
    }

    /**
     * Jedes Partikel auf seinen tatsächlichen Landepunkt ausrichten.
     * Eine gemeinsame Ausrichtung zur Balkenspitze passt nicht zu früher landenden Partikeln.
     */
    const rot = `${(Math.atan2(dy + ey, dx + ex) * 180) / Math.PI}deg`;

    return {
      id: i,
      variant,
      w,
      h,
      rot,
      delay,
      duration,
      ox,
      oy,
      ex,
      ey,
    };
  });
}

function buildExplosionParticles(
  intensity: number,
  celebration: boolean,
  spreadPx?: number,
): ExplosionParticleSpec[] {
  const n = Math.min(36, Math.max(12, Math.round(10 + intensity * 0.85)));
  const baseH = celebration ? 5.5 : 5;
  const spread =
    spreadPx != null && spreadPx > 0
      ? spreadPx
      : celebration
        ? 88
        : 56;

  return Array.from({ length: n }, (_, i) => {
    const variant = pickVariant();
    const h = baseH + Math.random() * (celebration ? 2 : 1.5);
    let w: number;
    if (variant === "circle") {
      w = h;
    } else if (variant === "short") {
      w = h * (2 + Math.random() * 0.8);
    } else {
      w = h * (3.2 + Math.random() * 1.2);
    }

    const angle = Math.random() * Math.PI * 2;
    const dist =
      spread * (celebration ? 0.38 + Math.random() * 0.72 : 0.32 + Math.random() * 0.68);
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist;
    const originJitter = spread * (celebration ? 0.14 : 0.11);
    const ox = (Math.random() - 0.5) * originJitter;
    const oy = (Math.random() - 0.5) * originJitter;
    const rot = `${(angle * 180) / Math.PI + (Math.random() - 0.5) * 40}deg`;

    return {
      id: i,
      variant,
      w,
      h,
      rot,
      delay: Math.random() * (celebration ? 110 : 45),
      duration: celebration
        ? 520 + Math.random() * 420
        : 280 + Math.random() * 160,
      ox,
      oy,
      ex,
      ey,
    };
  });
}

/**
 * Mintfarbene Partikel zwischen Puzzleteil und Punktebalken.
 * SVG-Filter pro Partikel vermeiden, da sie bei vielen Elementen die Animation verlangsamen.
 */
const DEFAULT_END_SCATTER: PlacementParticleEndScatter = {
  alongMax: 7,
  perpMax: 14,
};

export function PlacementParticleBurst({
  from,
  to,
  intensity = 12,
  endScatter: endScatterProp,
  fillAbsorb,
  mode = "placement",
  embedded = false,
  celebration = false,
  relaxedFlight = false,
  explosionSpreadPx,
  onComplete,
}: PlacementParticleBurstProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  /** Eine vorgegebene Streuung beibehalten, damit Partikel im Balken landen. */
  const scatterAlong =
    endScatterProp?.alongMax ??
    DEFAULT_END_SCATTER.alongMax * (relaxedFlight ? 1.55 : 1);
  const scatterPerp =
    endScatterProp?.perpMax ??
    DEFAULT_END_SCATTER.perpMax * (relaxedFlight ? 1.65 : 1);
  const particles = useMemo(
    () =>
      buildParticles(
        intensity,
        dx,
        dy,
        {
          alongMax: scatterAlong,
          perpMax: scatterPerp,
        },
        relaxedFlight,
        fillAbsorb,
      ),
    [intensity, dx, dy, scatterAlong, scatterPerp, relaxedFlight, fillAbsorb],
  );
  const explosionParticles = useMemo(
    () => buildExplosionParticles(intensity, celebration, explosionSpreadPx),
    [intensity, celebration, explosionSpreadPx],
  );

  const onCompleteRef = useLatestRef(onComplete);

  useEffect(() => {
    let rafId: number;
    let start: number | null = null;
    const fillMs = fillAbsorb?.fillDurationMs ?? 520;
    const fillStart = fillAbsorb?.fillStartDelayMs ?? 0;
    const duration =
      mode === "explosion"
        ? celebration
          ? 1180
          : 520
        : fillAbsorb
          ? fillStart + fillMs + 420
          : relaxedFlight
            ? 1180
            : 900;

    function tick(now: number) {
      if (start === null) start = now;
      const elapsed = now - start;
      if (elapsed >= duration) {
        onCompleteRef.current?.();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [celebration, fillAbsorb, mode, relaxedFlight, onCompleteRef]);

  const portalTarget =
    !embedded && typeof document !== "undefined"
      ? getAppViewportElement()
      : null;
  const portalRect = portalTarget?.getBoundingClientRect();
  const portalOffset = portalRect
    ? { x: portalRect.left, y: portalRect.top }
    : { x: 0, y: 0 };
  const localFrom = embedded
    ? { x: 0, y: 0 }
    : { x: from.x - portalOffset.x, y: from.y - portalOffset.y };
  const localTo = embedded
    ? { x: 0, y: 0 }
    : { x: to.x - portalOffset.x, y: to.y - portalOffset.y };
  const localDx = localTo.x - localFrom.x;
  const localDy = localTo.y - localFrom.y;
  const explosionOrigin = embedded ? { x: 0, y: 0 } : localFrom;

  const node =
    mode === "explosion" ? (
      <div
        className={cn(
          "placement-particle-burst placement-particle-burst--explosion",
          embedded && "placement-particle-burst--embedded",
          celebration && "placement-particle-burst--celebration",
        )}
        aria-hidden
      >
        {explosionParticles.map((p) => (
          <div
            key={p.id}
            className={cn(
              "placement-particle-burst__particle placement-particle-burst__particle--explosion",
              `placement-particle-burst__particle--${p.variant}`,
            )}
            style={
              {
                left: explosionOrigin.x,
                top: explosionOrigin.y,
                width: p.w,
                height: p.h,
                marginLeft: -p.w / 2,
                marginTop: -p.h / 2,
                "--burst-dx": `${p.ex}px`,
                "--burst-dy": `${p.ey}px`,
                "--p-rot": p.rot,
                "--p-ox": `${p.ox}px`,
                "--p-oy": `${p.oy}px`,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.duration}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    ) : (
      <div
        className={cn(
          "placement-particle-burst",
          fillAbsorb && "placement-particle-burst--fill-absorb",
        )}
        aria-hidden
      >
        {particles.map((p) => (
          <div
            key={p.id}
            className={cn(
              "placement-particle-burst__particle",
              `placement-particle-burst__particle--${p.variant}`,
            )}
            style={
              {
                left: localFrom.x,
                top: localFrom.y,
                width: p.w,
                height: p.h,
                marginLeft: -p.w / 2,
                marginTop: -p.h / 2,
                "--burst-dx": `${localDx}px`,
                "--burst-dy": `${localDy}px`,
                "--p-rot": p.rot,
                "--p-ox": `${p.ox}px`,
                "--p-oy": `${p.oy}px`,
                "--p-ex": `${p.ex}px`,
                "--p-ey": `${p.ey}px`,
                animationDelay: `${p.delay}ms`,
                animationDuration: `${p.duration}ms`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    );

  if (embedded) {
    return node;
  }

  if (!portalTarget) {
    return null;
  }

  return <OverlayPortal>{node}</OverlayPortal>;
}
