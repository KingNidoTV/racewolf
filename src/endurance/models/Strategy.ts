import type { Driver } from "./Driver";
import type { RaceSettings } from "./RaceSettings";
import type { Stint } from "./Stint";

/** Objectif de la stratégie générée. */
export type StrategyObjective = "max_tours" | "min_temps";

/** Résultat complet du générateur de stratégie. */
export interface Strategy {
  /** Nombre total de relais planifiés. */
  nombreRelaisTotal: number;
  relais: Stint[];
  /** Avertissements éventuels (contraintes non satisfaites, etc.). */
  avertissements: string[];
  /** Horodatage ISO de la génération. */
  genereLe: string;
  objectif: StrategyObjective;
  toursTotaux: number;
  /** Durée totale estimée (conduite + pits), en secondes. */
  dureeTotaleSecondes: number;
  /** Carburant total consommé sur la stratégie (litres). */
  carburantTotalLitres: number;
}

/** Plan de course persisté (paramètres + pilotes + stratégie optionnelle). */
export interface EndurancePlan {
  raceSettings: RaceSettings;
  drivers: Driver[];
  strategy: Strategy | null;
  /** Horodatage ISO quand l'utilisateur valide la stratégie (active le mode Live). */
  strategyValidatedAt: string | null;
}

export interface StrategyInput {
  raceSettings: RaceSettings;
  drivers: Driver[];
}
