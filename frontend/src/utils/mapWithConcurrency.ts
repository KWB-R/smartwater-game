/**
 * Verarbeitet items mit begrenzter Parallelität.
 * Die Ergebnisreihenfolge entspricht der Eingabereihenfolge.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
  onItemDone?: (completed: number, total: number) => void,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let completed = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  async function worker(): Promise<void> {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await fn(items[index], index);
      completed += 1;
      onItemDone?.(completed, items.length);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}
