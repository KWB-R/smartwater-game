import { useEffect, useRef, useState } from "react";
import { pickTransparentVideoPlaybackUrl } from "@/features/level/utils/videoPlaybackUrl";

type Props = {
  webUrl: string | null;
  movUrl: string | null;
  className?: string;
};

export function TransparentDebugVideo({ webUrl, movUrl, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void pickTransparentVideoPlaybackUrl(webUrl, movUrl).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [webUrl, movUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) {
      return;
    }
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    if (v.src !== src) {
      v.src = src;
      v.load();
    }
    void v.play().catch(() => {});
  }, [src]);

  if (!src) {
    return null;
  }

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      muted
      playsInline
      loop
      autoPlay
      preload="auto"
      crossOrigin="anonymous"
    />
  );
}
