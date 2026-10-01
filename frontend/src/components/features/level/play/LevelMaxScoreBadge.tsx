import { cn } from "@/lib/cn";

type LevelMaxScoreBadgeProps = {
  className?: string;
};

export function LevelMaxScoreBadge({ className }: LevelMaxScoreBadgeProps) {
  return (
    <p
      className={cn(
        "mb-2 self-center rounded-full bg-swg-purple px-4 py-1 font-display text-xl text-white",
        className,
      )}
    >
      Maximalpunktzahl!
    </p>
  );
}
