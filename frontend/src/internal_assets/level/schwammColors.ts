/** Dunkle und helle Körperfarbe zwischen Grau und Gelb interpolieren. */
const SCHWAMM_BODY = {
  dark: {
    gray: "#777777",
    yellow: "#EBD650",
  },
  light: {
    gray: "#EBEBEB",
    yellow: "#FAEB69",
  },
} as const;

export type SchwammBodyColors = {
  dark: string;
  light: string;
};

export type SchwammIconProps = {
  className?: string;
  /**
   * 0 steht für Grau, 1 für Gelb.
   * Vorgegebene bodyDark-/bodyLight-Werte haben Vorrang.
   */
  bodyTone?: number;
  bodyDark?: string;
  bodyLight?: string;
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const byte = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${byte(r)}${byte(g)}${byte(b)}`;
}

/** Hex-Farben linear mischen (`t` 0–1). */
function lerpHex(from: string, to: string, t: number): string {
  const u = clamp01(t);
  const [r0, g0, b0] = parseHex(from);
  const [r1, g1, b1] = parseHex(to);
  return toHex(r0 + (r1 - r0) * u, g0 + (g1 - g0) * u, b0 + (b1 - b0) * u);
}

/** Berechnet dunkle und helle Körperfarbe für den Anteil t zwischen Grau und Gelb. */
function schwammBodyAt(t: number): SchwammBodyColors {
  const u = clamp01(t);
  return {
    dark: lerpHex(SCHWAMM_BODY.dark.gray, SCHWAMM_BODY.dark.yellow, u),
    light: lerpHex(SCHWAMM_BODY.light.gray, SCHWAMM_BODY.light.yellow, u),
  };
}

/** Wandelt den Punkteanteil in den Farbanteil zwischen Grau und Gelb um. */
export function schwammBodyToneFromScore(
  score: number,
  maxScore: number,
): number {
  if (!(maxScore > 0)) {
    return 0;
  }
  return clamp01(score / maxScore);
}

/** Löst vorgegebene oder interpolierte Körperfarben aus den Props auf. */
export function resolveSchwammBodyColors({
  bodyTone = 1,
  bodyDark,
  bodyLight,
}: Pick<
  SchwammIconProps,
  "bodyTone" | "bodyDark" | "bodyLight"
>): SchwammBodyColors {
  if (bodyDark != null || bodyLight != null) {
    const base = schwammBodyAt(bodyTone);
    return {
      dark: bodyDark ?? base.dark,
      light: bodyLight ?? base.light,
    };
  }
  return schwammBodyAt(bodyTone);
}
