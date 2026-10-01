import { useEffect, useRef } from "react";
import { PlacementParticleBurst } from "@/components/features/level/PlacementParticleBurst";
import "@/components/features/level/session/levelGame.scss";

export type MapBonusMarkerBurstPoint = {
  id: number;
  x: number;
  y: number;
  intensity?: number;
  explosionSpreadPx?: number;
};

type Props = {
  points: MapBonusMarkerBurstPoint[];
  reducedMotion?: boolean;
  onAllComplete?: () => void;
};

export function MapBonusMarkerRevealParticles({
  points,
  reducedMotion = false,
  onAllComplete,
}: Props) {
  const completedRef = useRef(0);
  const pointsLengthRef = useRef(points.length);

  useEffect(() => {
    completedRef.current = 0;
    pointsLengthRef.current = points.length;
    if (reducedMotion && points.length > 0) {
      onAllComplete?.();
    }
  }, [points, reducedMotion, onAllComplete]);

  if (reducedMotion || points.length === 0) {
    return null;
  }

  const onBurstComplete = () => {
    completedRef.current += 1;
    if (completedRef.current >= pointsLengthRef.current) {
      onAllComplete?.();
    }
  };

  return (
    <>
      {points.map((point) => (
        <PlacementParticleBurst
          key={point.id}
          mode="explosion"
          celebration
          from={{ x: point.x, y: point.y }}
          to={{ x: point.x, y: point.y }}
          intensity={point.intensity ?? 14}
          explosionSpreadPx={point.explosionSpreadPx}
          onComplete={onBurstComplete}
        />
      ))}
    </>
  );
}
