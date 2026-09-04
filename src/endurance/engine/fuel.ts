import type { Driver } from "../models/Driver";

export interface FuelConfig {
  capaciteReservoirLitres: number;
  consommationLitresParTour: number;
}

/** Arrondi au dixième de litre (0,1 L/tour). */
export function roundConsommationLitresParTour(value: number): number {
  return Math.round(value * 10) / 10;
}

export function litresParTourDepuisLph(
  consommationLph: number,
  chronoSec: number,
): number {
  if (consommationLph <= 0 || chronoSec <= 0) return 0;
  return roundConsommationLitresParTour((consommationLph / 3600) * chronoSec);
}

export function fuelConfigActive(config: FuelConfig): boolean {
  return (
    config.capaciteReservoirLitres > 0 && config.consommationLitresParTour > 0
  );
}

export function fuelConfigPourPilote(
  capaciteReservoirLitres: number,
  pilote: Driver,
): FuelConfig {
  return {
    capaciteReservoirLitres,
    consommationLitresParTour: pilote.consommationLitresParTour,
  };
}

/** Nombre maximum de tours sur un plein. */
export function toursMaxCarburant(config: FuelConfig): number {
  if (!fuelConfigActive(config)) {
    return Number.POSITIVE_INFINITY;
  }

  const parTour = config.consommationLitresParTour;
  if (config.capaciteReservoirLitres <= 0 || parTour <= 0) return 0;
  return Math.floor(config.capaciteReservoirLitres / parTour);
}

/** Litres utilisés sur un relais de N tours. */
export function litresUtilisesSurRelais(
  tours: number,
  litresParTour: number,
): number {
  return tours * litresParTour;
}

/** Affichage conso à partir de L/h iRacing et d'un chrono. */
export function formatLitresParTour(lph: number, chronoSec: number): string {
  const lpt = litresParTourDepuisLph(lph, chronoSec);
  if (lpt <= 0) return "—";
  return `${lpt.toFixed(1)} L/tour`;
}
