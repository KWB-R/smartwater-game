import { cn } from "@/lib/cn";

type CelebrationRaysProps = {
  reducedMotion?: boolean;
  className?: string;
};

export function CelebrationRays({
  reducedMotion = false,
  className,
}: CelebrationRaysProps) {
  return (
    <div
      className={cn(
        "celebration-rays",
        reducedMotion && "celebration-rays--static",
        className,
      )}
      aria-hidden
    />
  );
}
