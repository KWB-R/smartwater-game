import { useId } from "react";

const STAR_CENTER = 21;

/** Vollständige Sternform mit Füllung und Kontur. */
const STAR_FILL_PATH =
  "M19.4248 35.6478L16.5729 37.2585L10.3885 40.7058C9.67072 41.0345 8.99435 41.1451 8.21772 40.7385C7.79917 40.5267 7.06551 39.7649 7.19441 38.9907L8.8559 28.9526C9.12803 27.3092 8.67129 26.0209 7.48883 24.8448L0.877919 18.2774C0.262025 17.6652 -0.12629 16.8972 0.0376299 16.0514C0.176087 15.3379 0.756969 14.5388 1.60203 14.3893L12.2759 12.495C12.8632 12.3907 13.7926 11.886 14.0647 11.3189L18.7341 1.60483C19.1431 0.755855 19.6969 0.12341 20.6104 0.0174834C21.5637 -0.0946744 22.4931 0.352399 22.9212 1.2372L27.2515 10.1818C27.8897 11.4996 28.7268 12.3361 30.2499 12.5963L40.5179 14.3488C41.9105 14.8815 42.3799 16.3364 41.6765 17.6792L34.5643 24.6704C33.6588 25.5599 32.871 26.7048 33.0938 28.0289L34.9001 38.7602C35.0433 39.6092 34.4163 40.4317 33.8529 40.7121C32.9808 41.1482 32.2344 40.9457 31.4403 40.5018L23.5419 36.0855C22.2798 35.3799 20.8873 35.0387 19.4264 35.6478H19.4248Z";

const DEFAULT_OUTLINE_WIDTH = 3;

export function StarIcon({
  fill,
  className,
  /** Skaliert Füllung und Kontur gemeinsam, etwa für den größeren mittleren Stern. */
  graphicScale = 1,
  /** Breite der schwarzen Kontur im SVG-Koordinatenraum von 0 bis 42. */
  outlineWidth = DEFAULT_OUTLINE_WIDTH,
}: {
  fill: string;
  className?: string;
  graphicScale?: number;
  outlineWidth?: number;
}) {
  const reactId = useId();
  const filterId = `star-inner-shadow-${reactId.replace(/:/g, "")}`;

  const graphicTransform =
    graphicScale === 1
      ? undefined
      : `translate(${STAR_CENTER} ${STAR_CENTER}) scale(${graphicScale}) translate(-${STAR_CENTER} -${STAR_CENTER})`;

  const graphic = (
    <>
      {/* Die Kontur vor der Füllung zeichnen, sodass ihre innere Hälfte verdeckt bleibt. */}
      <path
        d={STAR_FILL_PATH}
        fill="none"
        stroke="black"
        strokeWidth={outlineWidth}
        strokeLinejoin="round"
      />
      <path d={STAR_FILL_PATH} fill={fill} filter={`url(#${filterId})`} />
    </>
  );

  return (
    <svg
      viewBox="0 0 42 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      overflow="visible"
      aria-hidden
    >
      <defs>
        <filter
          id={filterId}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          {/* Alpha umkehren, damit Schatten und Unschärfe nach innen wirken. */}
          <feComponentTransfer in="SourceAlpha" result="inverted">
            <feFuncA type="table" tableValues="1 0" />
          </feComponentTransfer>
          <feGaussianBlur in="inverted" stdDeviation="2.2" result="blur" />
          <feOffset in="blur" dx="0" dy="1.6" result="offsetBlur" />
          <feComposite
            in="offsetBlur"
            in2="SourceAlpha"
            operator="in"
            result="insideMask"
          />
          <feFlood floodColor="#000000" floodOpacity="0.35" result="shadowColor" />
          <feComposite
            in="shadowColor"
            in2="insideMask"
            operator="in"
            result="innerShadow"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="innerShadow" />
          </feMerge>
        </filter>
      </defs>
      {graphicTransform ? (
        <g transform={graphicTransform}>{graphic}</g>
      ) : (
        graphic
      )}
    </svg>
  );
}
