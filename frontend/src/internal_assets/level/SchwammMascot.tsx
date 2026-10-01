import { useEffect, useRef, useState, type ComponentType } from "react";
import type { LevelMascotVariant } from "@/features/level/schwammMascot";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import { SchwammHappy } from "./SchwammHappy";
import { SchwammLevelEnd } from "./SchwammLevelEnd";
import { SchwammLevelEntry } from "./SchwammLevelEntry";
import { SchwammMaxScore } from "./SchwammMaxScore";
import { SchwammPuzzlePickedUp } from "./SchwammPuzzlePickedUp";
import { SchwammPuzzlePlaced } from "./SchwammPuzzlePlaced";
import { SchwammWaiting } from "./SchwammWaiting";
import type { SchwammIconProps } from "./schwammColors";

const SCHWAMM_BY_VARIANT: Record<
  LevelMascotVariant,
  ComponentType<SchwammIconProps>
> = {
  levelentry: SchwammLevelEntry,
  happy: SchwammHappy,
  wartend: SchwammWaiting,
  puzzlestückaufgenommen: SchwammPuzzlePickedUp,
  puzzlestückrichtiggelegt: SchwammPuzzlePlaced,
  levelend: SchwammLevelEnd,
  maximalpunktzahl: SchwammMaxScore,
};

const CROSSFADE_MS = 320;

type SchwammMascotProps = SchwammIconProps & {
  variant: LevelMascotVariant;
};

type Layer = {
  variant: LevelMascotVariant;
  bodyTone?: number;
  bodyDark?: string;
  bodyLight?: string;
};

function layerFromProps(
  variant: LevelMascotVariant,
  props: Pick<SchwammIconProps, "bodyTone" | "bodyDark" | "bodyLight">,
): Layer {
  return {
    variant,
    bodyTone: props.bodyTone,
    bodyDark: props.bodyDark,
    bodyLight: props.bodyLight,
  };
}

/** Lokales Schwamm-Maskottchen mit Überblendung zwischen den Varianten. */
export function SchwammMascot({
  variant,
  className,
  bodyTone,
  bodyDark,
  bodyLight,
}: SchwammMascotProps) {
  const reducedMotion = usePrefersReducedMotion();
  const propsRef = useRef({ bodyTone, bodyDark, bodyLight });
  propsRef.current = { bodyTone, bodyDark, bodyLight };

  const [current, setCurrent] = useState<Layer>(() =>
    layerFromProps(variant, { bodyTone, bodyDark, bodyLight }),
  );
  const [outgoing, setOutgoing] = useState<Layer | null>(null);
  const [incomingOpaque, setIncomingOpaque] = useState(true);
  const currentRef = useRef(current);
  currentRef.current = current;
  const fadeGenRef = useRef(0);

  // Beim Variantenwechsel überblenden.
  useEffect(() => {
    if (variant === currentRef.current.variant) {
      return;
    }

    if (reducedMotion) {
      fadeGenRef.current += 1;
      setOutgoing(null);
      setIncomingOpaque(true);
      setCurrent(layerFromProps(variant, propsRef.current));
      return;
    }

    const gen = ++fadeGenRef.current;
    setOutgoing(currentRef.current);
    setCurrent(layerFromProps(variant, propsRef.current));
    setIncomingOpaque(false);

    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (fadeGenRef.current !== gen) {
          return;
        }
        setIncomingOpaque(true);
      });
    });

    const done = window.setTimeout(() => {
      if (fadeGenRef.current !== gen) {
        return;
      }
      setOutgoing(null);
    }, CROSSFADE_MS);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(done);
    };
  }, [variant, reducedMotion]);

  // Farbe und Punktestand auch während der Überblendung aktuell halten.
  useEffect(() => {
    setCurrent((prev) => {
      if (
        prev.bodyTone === bodyTone &&
        prev.bodyDark === bodyDark &&
        prev.bodyLight === bodyLight
      ) {
        return prev;
      }
      return { ...prev, bodyTone, bodyDark, bodyLight };
    });
  }, [bodyTone, bodyDark, bodyLight]);

  const CurrentIcon = SCHWAMM_BY_VARIANT[current.variant];
  const OutgoingIcon = outgoing
    ? SCHWAMM_BY_VARIANT[outgoing.variant]
    : null;

  const layerClass = "absolute inset-0 block h-full w-full";
  const fadeStyle = { transitionDuration: `${CROSSFADE_MS}ms` };

  return (
    <span className={cn("relative block h-full w-full", className)}>
      {OutgoingIcon && outgoing ? (
        <span
          className={cn(
            layerClass,
            "transition-opacity ease-out",
            incomingOpaque ? "opacity-0" : "opacity-100",
          )}
          style={fadeStyle}
          aria-hidden
        >
          <OutgoingIcon
            className="block h-full w-full"
            bodyTone={outgoing.bodyTone}
            bodyDark={outgoing.bodyDark}
            bodyLight={outgoing.bodyLight}
          />
        </span>
      ) : null}
      <span
        className={cn(
          outgoing ? layerClass : "block h-full w-full",
          outgoing && "transition-opacity ease-out",
          outgoing
            ? incomingOpaque
              ? "opacity-100"
              : "opacity-0"
            : undefined,
        )}
        style={outgoing ? fadeStyle : undefined}
      >
        <CurrentIcon
          className="block h-full w-full"
          bodyTone={current.bodyTone}
          bodyDark={current.bodyDark}
          bodyLight={current.bodyLight}
        />
      </span>
    </span>
  );
}
