import type { LevelConfigJson } from "@/features/level/schemas/levelConfigSchema";

/** Leere Config, wenn kein `assets/<bezirk>/<level>/config.json` existiert. */
export const EMPTY_LEVEL_CONFIG: LevelConfigJson = {
  name: "",
  background: { url: "" },
  objects: [],
  endAnimation: undefined,
};
