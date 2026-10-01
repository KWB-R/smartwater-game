export const PUNKTE_CATEGORY_KEYS = [
  'bio',
  'water_protection',
  'climate',
  'green_spaces',
  'green_water',
  'flood_prevention',
] as const;

export type PunkteCategoryKey = (typeof PUNKTE_CATEGORY_KEYS)[number];

export type PunkteCategoryValues = {
  bonus: number;
  isBonus: boolean;
  isMission: boolean;
};

export type PunkteNested = Record<PunkteCategoryKey, PunkteCategoryValues>;

type PunkteLike = Record<string, unknown> | null | undefined;

function isNestedPunkte(value: PunkteLike): value is PunkteNested {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return PUNKTE_CATEGORY_KEYS.every((key) => {
    const entry = value[key];
    return (
      entry != null &&
      typeof entry === 'object' &&
      'bonus' in entry &&
      'isBonus' in entry
    );
  });
}

export function getMissionCategoryKey(mission: unknown): PunkteCategoryKey | null {
  if (mission == null || typeof mission !== 'object') {
    return null;
  }

  const record = mission as Record<string, unknown>;
  const inner =
    record.data != null && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>)
      : record;

  const type = inner.type;
  if (typeof type !== 'string') {
    return null;
  }

  return (PUNKTE_CATEGORY_KEYS as readonly string[]).includes(type)
    ? (type as PunkteCategoryKey)
    : null;
}

export function nestPunkte(
  flat: PunkteLike,
  missionCategoryKey: PunkteCategoryKey | null = null,
): PunkteNested | PunkteLike {
  if (flat == null) {
    return flat;
  }

  const alreadyNested = isNestedPunkte(flat);
  const nested = {} as PunkteNested;

  for (const key of PUNKTE_CATEGORY_KEYS) {
    nested[key] = {
      bonus: alreadyNested
        ? Number(flat[key].bonus)
        : Number(flat[`${key}_bonus`] ?? 0),
      isBonus: alreadyNested
        ? Boolean(flat[key].isBonus)
        : Boolean(flat[`${key}_isBonus`]),
      isMission: missionCategoryKey != null && key === missionCategoryKey,
    };
  }

  return nested;
}

function transformPuzzleItem(
  item: Record<string, unknown>,
  missionCategoryKey: PunkteCategoryKey | null,
) {
  if (item.__component !== 'object.puzzle-item' || !item.punkte) {
    return item;
  }

  return {
    ...item,
    punkte: nestPunkte(item.punkte as PunkteLike, missionCategoryKey),
  };
}

export function transformLevelPuzzleItems<T extends Record<string, unknown>>(level: T): T {
  if (!Array.isArray(level.puzzleItems)) {
    return level;
  }

  const missionCategoryKey = getMissionCategoryKey(level.mission);

  return {
    ...level,
    puzzleItems: level.puzzleItems.map((item) =>
      transformPuzzleItem(item as Record<string, unknown>, missionCategoryKey),
    ),
  };
}
