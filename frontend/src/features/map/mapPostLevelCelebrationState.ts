import type { MapBonusUnlockLocationState } from "@/features/map/mapBonusLevelUnlock";
import type { MapLevelStartLocationState } from "@/features/map/mapDistrictDetailUrl";

/** Router-Zustand für die Rückkehr zur Karte nach dem Levelabschluss. */
export type MapPostLevelCelebrationLocationState = {
  mapPostLevelCelebration?: unknown;
  celebrationStarCount?: unknown;
  celebrationDistrictRouteId?: unknown;
  /** Bereits gelbe Sterne vor dieser Runde (0–3). */
  celebrationFromStarCount?: unknown;
  /** @deprecated Der Bonus erscheint nach dem Detail-Sheet im Kartenintro. */
  celebrationBonusAfterDismiss?: unknown;
  /** Der Bezirk war vor dem Abschluss noch grau und wird im Kartenintro gelb. */
  celebrationMapDistrictWasUnhighlighted?: unknown;
  /** Der Bezirk wurde vollständig gelöst; der Zähler wird im Kartenintro erhöht. */
  celebrationMapDistrictNewlyFullySolved?: unknown;
  /** Schaltet Bonuslevel während des Kartenintros sichtbar. */
  celebrationMapRevealBonus?: unknown;
  /** Zeigt an, ob der Marker vor dieser Runde bereits eine Quizkrone hatte. */
  celebrationMapMarkerWasLevelMaxBeforeRun?: unknown;
  /**
   * Das Kartenintro ist bereits abgeschlossen.
   * Es startet erst, wenn das vorherige Detail-Sheet geschlossen wurde.
   */
  mapPostLevelMapIntroDone?: unknown;
  /**
   * Das Abschlussdetail mit Sternen und Krone ist noch offen.
   * Die URL bleibt /karte; beim Schließen beginnt das Kartenintro.
   */
  mapPostLevelDetailPending?: unknown;
};

export type MapReturnFromShareLocationState = MapLevelStartLocationState &
  MapPostLevelCelebrationLocationState &
  MapBonusUnlockLocationState;
