import type { LevelProgress } from "@/features/level/levelProgress";

/** Bis zur Bezirksfärbung den ungelösten Marker zeigen, danach den tatsächlichen Fortschritt. */
export function mapMarkerProgressForIntroDefer(
  progressByLevelKey: ReadonlyMap<string, LevelProgress | null>,
  deferLevelKeys: ReadonlySet<string> | undefined,
): ReadonlyMap<string, LevelProgress | null> {
  if (!deferLevelKeys?.size) {
    return progressByLevelKey;
  }
  const next = new Map(progressByLevelKey);
  for (const key of deferLevelKeys) {
    const progress = next.get(key);
    next.set(key, {
      completed: false,
      stars: 0,
      updatedAt: progress?.updatedAt ?? Date.now(),
    });
  }
  return next;
}
