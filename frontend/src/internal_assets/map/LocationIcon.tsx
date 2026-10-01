function LocationIconPaths({ pinFill }: { pinFill: string }) {
  return (
    <>
      <path
        d="M63.5947 17.5742C119.769 -14.806 189.537 1.21198 224.896 57.2812C251.415 99.3326 248.763 138.49 233.846 175.714C218.889 213.036 191.671 248.276 169.068 282.513C154.289 304.899 139.527 327.31 124.8 349.728C123.807 347.3 122.185 344.842 120.938 342.956C99.0476 309.868 76.5219 277.277 54.7334 244.122L50.3867 237.483C18.554 188.673 -12.7561 148.074 7.33984 86.0488L7.82422 84.5801C17.1997 56.6097 38.8392 31.8417 63.5947 17.5742ZM171.457 74.0156C134.765 40.2119 76.5546 53.6443 59.4385 102.015C38.5355 161.078 96.5525 217.017 151.441 192.431C196.788 172.117 209.312 108.891 171.457 74.0156Z"
        fill={pinFill}
        stroke="black"
        strokeWidth={6}
      />
      <path
        d="M68.0322 173.6C17.8522 111.922 84.5618 26.4465 154.739 59.3057C174.196 68.4163 187.195 82.0421 193.642 103.361C200.716 126.762 196.806 148.358 183.586 168.483C156.146 210.246 99.5575 211.926 68.3369 173.965L68.0371 173.6H68.0322Z"
        fill="white"
        stroke="black"
        strokeWidth={6}
      />
    </>
  );
}

const LOCATION_ICON_VIEWBOX = "0 -5 246 358";

/** SVG-Marker ohne foreignObject für eine scharfe Darstellung auf iOS. */
export function LocationMapMarkerSvg({
  x,
  y,
  width,
  height,
  className,
  pinFill = "var(--color-swg-green)",
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
  pinFill?: string;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={LOCATION_ICON_VIEWBOX}
      fill="none"
      className={className}
      aria-hidden
      overflow="visible"
    >
      <LocationIconPaths pinFill={pinFill} />
    </svg>
  );
}
