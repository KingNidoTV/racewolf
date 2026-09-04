import { litresParTourDepuisLph, roundConsommationLitresParTour } from "../engine/fuel";
import { createDriver } from "./Driver";
import type { Driver } from "./Driver";
import { DEFAULT_RACE_SETTINGS } from "./RaceSettings";
import type { EndurancePlan } from "./Strategy";
import type { RaceSettings } from "./RaceSettings";
import type { Stint } from "./Stint";
import type { Strategy } from "./Strategy";

type LegacyRaceSettings = Partial<RaceSettings> & {
  durationMinutes?: number;
  circuit?: string;
  voiture?: string;
  tempsPitMoyenSecondes?: number;
  consommationLitresParHeure?: number;
  consommationEstimee?: boolean;
  reserveCarburantLitres?: number;
};

type LegacyDriver = Partial<Driver> & {
  chronoAttackSecondes?: number;
  chronoSafeSecondes?: number;
  consommationLitresParHeure?: number;
  carburantSupplementaireLitresParHeure?: number;
};

function migrateRaceSettings(raw: LegacyRaceSettings | undefined): RaceSettings {
  const base = { ...DEFAULT_RACE_SETTINGS };
  if (!raw) return base;

  return {
    ...base,
    ...raw,
    dureeType: raw.dureeType ?? "time",
    durationMinutes: raw.durationMinutes ?? base.durationMinutes,
    durationLaps: raw.durationLaps ?? base.durationLaps,
    circuitId: raw.circuitId ?? "",
    circuit: raw.circuit ?? "",
    voitureId: raw.voitureId ?? "",
    voiture: raw.voiture ?? "",
    tempsPitMoyenSecondes:
      raw.tempsPitMoyenSecondes ?? base.tempsPitMoyenSecondes,
    tempsPitEstime: raw.tempsPitEstime ?? true,
    capaciteReservoirLitres:
      raw.capaciteReservoirLitres ?? base.capaciteReservoirLitres,
    capaciteReservoirEstimee: raw.capaciteReservoirEstimee ?? true,
    nombreTrainsPneus: raw.nombreTrainsPneus ?? base.nombreTrainsPneus,
    trainsPneusIllimites: raw.trainsPneusIllimites ?? base.trainsPneusIllimites,
  };
}

function migrateDriver(
  raw: LegacyDriver | undefined,
  index: number,
  legacyConso?: number,
  legacyConsoEstimee?: boolean,
): Driver {
  const base = createDriver(index);
  if (!raw) return base;

  const chronoSecondes =
    raw.chronoSecondes ??
    raw.chronoSafeSecondes ??
    raw.chronoAttackSecondes ??
    base.chronoSecondes;
  const legacyLph =
    (raw.consommationLitresParHeure ?? legacyConso ?? 0) +
    Math.max(0, raw.carburantSupplementaireLitresParHeure ?? 0);
  const consommationLitresParTour = roundConsommationLitresParTour(
    raw.consommationLitresParTour && raw.consommationLitresParTour > 0
      ? raw.consommationLitresParTour
      : legacyLph > 0
        ? litresParTourDepuisLph(legacyLph, chronoSecondes)
        : base.consommationLitresParTour,
  );

  return {
    ...base,
    ...raw,
    chronoSecondes,
    consommationLitresParTour,
    consommationEstimee:
      raw.consommationEstimee ?? legacyConsoEstimee ?? true,
    absences: Array.isArray(raw.absences) ? raw.absences : [],
  };
}

function migrateStint(raw: Partial<Stint>, index: number): Stint {
  return {
    numero: raw.numero ?? index + 1,
    heureDebut: raw.heureDebut ?? "00:00:00",
    heureFin: raw.heureFin ?? "00:00:00",
    piloteId: raw.piloteId ?? "",
    toursPrevus: raw.toursPrevus ?? 0,
    dureeSecondes: raw.dureeSecondes ?? 0,
    carburantUtiliseLitres: raw.carburantUtiliseLitres ?? 0,
    toursMaxCarburant: raw.toursMaxCarburant ?? 0,
    changementPneus: raw.changementPneus ?? index === 0,
  };
}

function migrateStrategy(raw: Strategy | null | undefined): Strategy | null {
  if (!raw) return null;
  return {
    ...raw,
    relais: Array.isArray(raw.relais)
      ? raw.relais.map((s, i) => migrateStint(s, i))
      : [],
  };
}

export function migrateEndurancePlan(raw: Partial<EndurancePlan> | null): EndurancePlan {
  if (!raw) {
    return {
      raceSettings: { ...DEFAULT_RACE_SETTINGS },
      drivers: [],
      strategy: null,
      strategyValidatedAt: null,
    };
  }

  const legacyRace = raw.raceSettings as LegacyRaceSettings | undefined;
  const legacyConso = legacyRace?.consommationLitresParHeure;
  const legacyConsoEstimee = legacyRace?.consommationEstimee;

  return {
    raceSettings: migrateRaceSettings(legacyRace),
    drivers: Array.isArray(raw.drivers)
      ? raw.drivers.map((d, i) =>
          migrateDriver(d, i, legacyConso, legacyConsoEstimee),
        )
      : [],
    strategy: migrateStrategy(raw.strategy),
    strategyValidatedAt:
      typeof raw.strategyValidatedAt === "string"
        ? raw.strategyValidatedAt
        : null,
  };
}
