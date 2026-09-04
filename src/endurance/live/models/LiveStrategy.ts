import type { Stint } from "../../models/Stint";

/** Événement déclenchant un recalcul de la stratégie live. */
export type LiveRecalcTrigger =
  | "initial"
  | "repair"
  | "safety_car"
  | "weather_change"
  | "stint_update"
  | "manual";

/** Stratégie projetée en course (ajustée par rapport au plan validé). */
export interface LiveStrategy {
  strategieValidee: boolean;
  relaisActuel: number;
  relaisProjete: Stint[];
  retardSecondes: number;
  dernierRecalcul: string;
  dernierDeclencheur: LiveRecalcTrigger;
  avertissements: string[];
  /** Écart cumulé vs plan initial (positif = retard). */
  ecartPlanSecondes: number;
}

export const DEFAULT_LIVE_STRATEGY: LiveStrategy = {
  strategieValidee: false,
  relaisActuel: 1,
  relaisProjete: [],
  retardSecondes: 0,
  dernierRecalcul: new Date(0).toISOString(),
  dernierDeclencheur: "initial",
  avertissements: [],
  ecartPlanSecondes: 0,
};
