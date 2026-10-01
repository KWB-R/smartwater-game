import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/cn";
import { KronenIcon } from "@/internal_assets/icons/KronenIcon";
import { SchwammMascot } from "@/internal_assets/level/SchwammMascot";
import { schwammBodyToneFromScore } from "@/internal_assets/level/schwammColors";
import type { LevelMascotVariant } from "@/features/level/schwammMascot";
import { headerBarPassLineOffsetFromRight } from "@/features/level/logic/levelBarCompletion";
import { HeaderProgressScoreParticles } from "./HeaderProgressScoreParticles";

type Props = {
  districtName: string;
  missionLabel: string;
  mascotVariant: LevelMascotVariant;
  /** Punkte für den Fortschrittsbalken */
  score: number;
  maxScore: number;
  trailing?: ReactNode;
  /** static belässt den Header im normalen Seitenfluss, etwa beim Level-Einstieg. */
  placement?: "fixed" | "static";
  progressBarRef?: RefObject<HTMLDivElement | null>;
  /** Fortschrittsbalken-Zeile (Tutorial-Highlight). */
  missionProgressRowRef?: RefObject<HTMLDivElement | null>;
  /** Schwamm-Maskottchen als Ziel für das Tutorial. */
  headerSpongeRef?: RefObject<HTMLButtonElement | null>;
  /** Unterdrückt den eigenen Punkteeffekt, wenn der Levelablauf die Partikel steuert. */
  suppressScoreParticles?: boolean;
  /** Position der Bestehensgrenze aus minimumScorePercentage. */
  minimumScorePercentage?: number | null;
  /** Krone am Balkenende bei Maximalpunktzahl. */
  showMaxScoreCrown?: boolean;
  /** Krone am Schwamm (z. B. Quiz richtig beantwortet). */
  showMascotCrown?: boolean;
  /** Einmalige Einstiegsanimation (Schwamm von oben). */
  mascotEnter?: boolean;
  /** Kurzer Hinweis auf dem Balken (z. B. „+5 Punkte“). */
  scoreGainLabel?: string | null;
};

const SCORE_GAIN_LABEL_ANIM_MS = 240;
/** Anzeigedauer des Punktehinweises, auch wenn der übergebene Wert länger bestehen bleibt. */
const SCORE_GAIN_LABEL_HOLD_MS = 1400;
/**
 * Den Puls mit der Ankunft der Levelpartikel abstimmen.
 * Ohne Partikelflug den Balken sofort pulsieren lassen.
 */
const MISSION_BAR_PULSE_DELAY_FLIGHT_MS = 520;
const MISSION_BAR_PULSE_DELAY_LOCAL_MS = 40;

export function MapGameHeaderView({
  districtName,
  missionLabel,
  mascotVariant,
  score,
  maxScore,
  trailing,
  placement = "fixed",
  progressBarRef: progressBarRefProp,
  missionProgressRowRef,
  headerSpongeRef,
  suppressScoreParticles = false,
  minimumScorePercentage,
  showMaxScoreCrown = false,
  showMascotCrown = false,
  mascotEnter = false,
  scoreGainLabel = null,
}: Props) {
  const localProgressRef = useRef<HTMLDivElement>(null);
  const progressBarRef = progressBarRefProp ?? localProgressRef;
  const safeMax = Math.max(1, maxScore);
  const safeScore = Math.min(safeMax, Math.max(0, score));
  const progress = safeScore / safeMax;
  const mascotBodyTone = schwammBodyToneFromScore(safeScore, safeMax);
  const atMaxBarScore = safeScore >= safeMax - 0.001;
  const showBarCrown = showMaxScoreCrown && atMaxBarScore && !showMascotCrown;

  /** Beim ersten Zeichnen keine Breitenanimation, damit der Balken nach erneutem Einbinden nicht von null startet. */
  const [barWidthTransitionReady, setBarWidthTransitionReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setBarWidthTransitionReady(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  const [displayedScoreGainLabel, setDisplayedScoreGainLabel] = useState<
    string | null
  >(null);
  /** shown zeigt den Hinweis; exit-up blendet ihn nach oben aus; enter blendet ihn ein. */
  const [scoreGainLabelMotion, setScoreGainLabelMotion] = useState<
    "shown" | "exit-up" | "enter"
  >("shown");
  const displayedScoreGainLabelRef = useRef<string | null>(null);
  const scoreGainLabelTimerRef = useRef<number | null>(null);
  const scoreGainLabelRafRef = useRef<number | null>(null);
  const scoreGainLabelHoldRef = useRef<number | null>(null);
  const prevScoreForPulseRef = useRef(safeScore);
  const [barPulseActive, setBarPulseActive] = useState(false);

  /** Puls wenn Punkte ankommen (Partikel-Ziel / Score-Delta). */
  useEffect(() => {
    const prev = prevScoreForPulseRef.current;
    prevScoreForPulseRef.current = safeScore;
    if (safeScore <= prev + 0.001) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const delayMs = suppressScoreParticles
      ? MISSION_BAR_PULSE_DELAY_FLIGHT_MS
      : MISSION_BAR_PULSE_DELAY_LOCAL_MS;
    let rafId = 0;
    const timeoutId = window.setTimeout(() => {
      setBarPulseActive(false);
      rafId = window.requestAnimationFrame(() => {
        setBarPulseActive(true);
      });
    }, delayMs);
    return () => {
      window.clearTimeout(timeoutId);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [safeScore, suppressScoreParticles]);

  useEffect(() => {
    const clearScheduled = () => {
      if (scoreGainLabelTimerRef.current != null) {
        window.clearTimeout(scoreGainLabelTimerRef.current);
        scoreGainLabelTimerRef.current = null;
      }
      if (scoreGainLabelRafRef.current != null) {
        window.cancelAnimationFrame(scoreGainLabelRafRef.current);
        scoreGainLabelRafRef.current = null;
      }
      if (scoreGainLabelHoldRef.current != null) {
        window.clearTimeout(scoreGainLabelHoldRef.current);
        scoreGainLabelHoldRef.current = null;
      }
    };

    const hideLabel = () => {
      displayedScoreGainLabelRef.current = null;
      setDisplayedScoreGainLabel(null);
      setScoreGainLabelMotion("shown");
    };

    const exitUpThen = (then: () => void) => {
      setScoreGainLabelMotion("exit-up");
      scoreGainLabelTimerRef.current = window.setTimeout(() => {
        scoreGainLabelTimerRef.current = null;
        then();
      }, SCORE_GAIN_LABEL_ANIM_MS);
    };

    const showLabel = (text: string) => {
      displayedScoreGainLabelRef.current = text;
      setDisplayedScoreGainLabel(text);
      setScoreGainLabelMotion("enter");
      scoreGainLabelRafRef.current = window.requestAnimationFrame(() => {
        scoreGainLabelRafRef.current = null;
        setScoreGainLabelMotion("shown");
      });
      scoreGainLabelHoldRef.current = window.setTimeout(() => {
        scoreGainLabelHoldRef.current = null;
        if (displayedScoreGainLabelRef.current == null) {
          return;
        }
        exitUpThen(hideLabel);
      }, SCORE_GAIN_LABEL_HOLD_MS);
    };

    clearScheduled();

    const current = displayedScoreGainLabelRef.current;

    if (!scoreGainLabel) {
      if (!current) {
        return clearScheduled;
      }
      exitUpThen(hideLabel);
      return clearScheduled;
    }

    if (!current) {
      showLabel(scoreGainLabel);
      return clearScheduled;
    }

    if (current === scoreGainLabel) {
      // Bei erneutem Einbinden die Anzeigedauer neu starten, damit der Hinweis nicht dauerhaft stehen bleibt.
      scoreGainLabelHoldRef.current = window.setTimeout(() => {
        scoreGainLabelHoldRef.current = null;
        exitUpThen(hideLabel);
      }, SCORE_GAIN_LABEL_HOLD_MS);
      return clearScheduled;
    }

    exitUpThen(() => showLabel(scoreGainLabel));
    return clearScheduled;
  }, [scoreGainLabel]);

  const isFixed = placement === "fixed";
  const placementClass = isFixed
    ? "fixed inset-x-0 top-[var(--default-header-h,3.25rem)] z-[90]"
    : "relative w-full min-h-0 shrink-0";

  const heightClass = isFixed ? "min-h-[7.5rem]" : "min-h-0";

  const topPaddingClass = isFixed
    ? "pt-[0.65rem]"
    : "pt-[calc(0.65rem+env(safe-area-inset-top,0px))]";

  /**
   * Nur den Inhaltsabstand ausgleichen, nicht die obere Safe Area.
   * Sonst rutscht das Maskottchen in der iPhone-PWA unter die Statusleiste.
   */
  const spongeBleedClass =
    "-mt-[calc(0.65rem-10px)] -mb-[0.85rem] h-[calc(100%+1.5rem-10px)]";

  return (
    <header
      className={cn(
        placementClass,
        heightClass,
        topPaddingClass,
        "grid grid-cols-[6rem_1fr_4.5rem] items-stretch bg-swg-blue-dark px-0 pb-[0.85rem] text-white",
      )}
      aria-label="Bezirk und Mission"
    >
      <button
        type="button"
        ref={headerSpongeRef}
        className={cn(
          "relative flex items-end justify-center overflow-visible border-0 bg-transparent p-0 text-white",
          spongeBleedClass,
        )}
        aria-label="Tipps"
      >
        <span
          className={cn(
            "pointer-events-none block h-full w-full origin-center",
            mascotEnter && "mission-header-mascot--enter",
          )}
        >
          <SchwammMascot
            variant={mascotVariant}
            bodyTone={mascotBodyTone}
            className="block h-full w-full object-contain object-center"
          />
        </span>
        {showMascotCrown ? (
          <span
            className="pointer-events-none absolute top-0 z-[3] block w-[2.15rem] -translate-x-[70%] translate-y-[30%] -rotate-30  mission-header-crown--pulse [&_svg]:h-auto [&_svg]:w-full"
            aria-hidden
          >
            <KronenIcon className="mission-header-crown__icon" />
          </span>
        ) : null}
      </button>

      <div className="flex min-w-0 flex-col justify-center gap-0.5 px-1.5">
        <p className="m-0 font-display text-[0.6875rem]  uppercase leading-tight tracking-wide">
          {districtName.toLocaleUpperCase("de-DE")}
        </p>
        <h1 className="m-0 font-text text-xl font-bold leading-tight text-nowrap overflow-hidden text-ellipsis">
          {missionLabel}
        </h1>
        <div ref={missionProgressRowRef} className="mt-1.5 flex items-center">
          <div
            className={cn(
              "min-w-0 w-full rounded-[2rem]",
              barPulseActive &&
                "animate-mission-bar-pulse motion-reduce:animate-none",
            )}
            onAnimationEnd={(event) => {
              if (event.target !== event.currentTarget) {
                return;
              }
              setBarPulseActive(false);
            }}
          >
            <div
              ref={progressBarRef}
              className="relative -translate-x-1 h-10 min-w-0 w-full overflow-hidden rounded-[2rem] bg-white"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={safeMax}
              aria-valuenow={safeScore}
              aria-label="Punktefortschritt"
            >
              <span
                className={cn(
                  "block h-full rounded-l-[0.4rem] bg-swg-green-light",
                  barWidthTransitionReady &&
                    "transition-[width] duration-[520ms] ease-linear",
                )}
                style={{ width: `${progress * 100}%` }}
              />
              {displayedScoreGainLabel ? (
                <span
                  className={cn(
                    "pointer-events-none absolute inset-0 z-[1] flex items-center justify-start px-2 transition-[transform,opacity] ease-out",
                    scoreGainLabelMotion === "exit-up"
                      ? "-translate-y-2.5 opacity-0"
                      : scoreGainLabelMotion === "enter"
                        ? "translate-y-0 opacity-0"
                        : "translate-y-0 opacity-100",
                  )}
                  style={{
                    transitionDuration: `${SCORE_GAIN_LABEL_ANIM_MS}ms`,
                  }}
                  aria-hidden
                >
                  <span className="w-full text-left font-display text-[1.2rem] font-semibold uppercase leading-snug tracking-tight text-swg-black">
                    {displayedScoreGainLabel}
                  </span>
                </span>
              ) : null}
              <span
                className="pointer-events-none absolute inset-y-0 w-0.5 bg-swg-blue-dark"
                style={{
                  right: `${headerBarPassLineOffsetFromRight(minimumScorePercentage) * 100}%`,
                }}
                aria-hidden
              />
              {showBarCrown ? (
                <span
                  className="pointer-events-none absolute top-1/2 right-0.5 z-[2] flex -translate-y-1/2 items-center justify-center mission-header-crown--pulse"
                  aria-hidden
                >
                  <KronenIcon className="mission-header-crown__icon block h-[1.75rem] w-[2.3rem]" />
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-end pr-1.5 pt-1">{trailing}</div>
      <HeaderProgressScoreParticles
        progressBarRef={progressBarRef}
        score={safeScore}
        maxScore={safeMax}
        suppressAutoBurst={suppressScoreParticles}
      />
    </header>
  );
}
