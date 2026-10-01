import { resolveStrapiMediaUrl } from "@/api/media";

function absoluteMediaUrl(url: string): string {
  const resolved = resolveStrapiMediaUrl(url);
  try {
    return new URL(
      resolved,
      typeof window !== "undefined" ? window.location.href : undefined,
    ).href;
  } catch {
    return resolved;
  }
}

export type OfflineMediaUrlDiff = {
  added: string[];
  removed: string[];
  overlap: string[];
};

/** Vergleicht absolute Medien-URLs und liefert Änderungen ebenfalls als absolute URLs. */
export function diffOfflineMediaUrls(
  previous: readonly string[],
  next: readonly string[],
): OfflineMediaUrlDiff {
  const prevAbs = new Set<string>();
  for (const url of previous) {
    const trimmed = String(url ?? "").trim();
    if (trimmed) {
      prevAbs.add(absoluteMediaUrl(trimmed));
    }
  }
  const nextAbs = new Set<string>();
  for (const url of next) {
    const trimmed = String(url ?? "").trim();
    if (trimmed) {
      nextAbs.add(absoluteMediaUrl(trimmed));
    }
  }

  const added: string[] = [];
  const removed: string[] = [];
  const overlap: string[] = [];

  for (const url of nextAbs) {
    if (prevAbs.has(url)) {
      overlap.push(url);
    } else {
      added.push(url);
    }
  }
  for (const url of prevAbs) {
    if (!nextAbs.has(url)) {
      removed.push(url);
    }
  }

  return { added, removed, overlap };
}
