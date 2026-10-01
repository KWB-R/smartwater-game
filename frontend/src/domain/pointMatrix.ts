/** Punkte je Wirkungsbereich, unabhängig vom CMS. */
export type PointMatrix = {
  default: number;
  cooling: number;
  flooding: number;
  water: number;
  biodiversity: number;
  quality: number;
};

export type GoalFocusDimension = Exclude<keyof PointMatrix, "default">;
