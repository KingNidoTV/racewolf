import type { Driver } from "../models/Driver";
import type { RaceSettings } from "../models/RaceSettings";
import type { Stint } from "../models/Stint";
import type { Strategy } from "../models/Strategy";
import { chronoPilote } from "./optimizeStint";
import {
  fuelConfigActive,
  fuelConfigPourPilote,
  litresUtilisesSurRelais,
  toursMaxCarburant,
} from "./fuel";
import { timestampMsToClock, toRaceTimestampMs } from "./time";

function compterChangementsPneus(relais: Stint[]): number {
  return relais.filter((r) => r.changementPneus).length;
}

function avertissementsPneus(
  raceSettings: RaceSettings,
  relais: Stint[],
): string[] {
  if (raceSettings.trainsPneusIllimites) return [];
  const changements = compterChangementsPneus(relais);
  const max = raceSettings.nombreTrainsPneus;
  if (max <= 0) {
    return ["Aucun train de pneus disponible — décochez les changements ou augmentez le stock."];
  }
  if (changements > max) {
    return [
      `Trop de changements de pneus (${changements}) pour ${max} train${max > 1 ? "s" : ""} disponible${max > 1 ? "s" : ""}.`,
    ];
  }
  return [];
}

/**
 * Recalcule heures, durées et carburant à partir des relais modifiés par l'utilisateur.
 */
export function recalculerStrategie(
  raceSettings: RaceSettings,
  drivers: Driver[],
  strategy: Strategy,
): Strategy {
  const avertissements: string[] = [];
  const pitSec = raceSettings.tempsPitMoyenSecondes;
  const pitMs = pitSec * 1000;
  const debutCourseMs = toRaceTimestampMs(
    raceSettings.date,
    raceSettings.startTime,
  );

  let curseurMs = debutCourseMs;
  const relais: Stint[] = [];

  for (const stint of strategy.relais) {
    const pilote = drivers.find((d) => d.id === stint.piloteId);
    if (!pilote) {
      avertissements.push(`Pilote inconnu au relais ${stint.numero}.`);
      relais.push(stint);
      curseurMs += stint.dureeSecondes * 1000 + pitMs;
      continue;
    }

    const chronoSec = chronoPilote(pilote);
    const tours = Math.max(1, Math.round(stint.toursPrevus));
    if (chronoSec <= 0) {
      avertissements.push(`Chrono invalide pour ${pilote.nom} (relais ${stint.numero}).`);
    }

    const fuel = fuelConfigPourPilote(
      raceSettings.capaciteReservoirLitres,
      pilote,
    );
    const dureeSecondes = chronoSec > 0 ? tours * chronoSec : stint.dureeSecondes;
    const finRelaisMs = curseurMs + dureeSecondes * 1000;
    const maxFuel = toursMaxCarburant(fuel);
    const carburantUtiliseLitres = fuelConfigActive(fuel)
      ? litresUtilisesSurRelais(tours, fuel.consommationLitresParTour)
      : 0;

    if (
      fuelConfigActive(fuel) &&
      Number.isFinite(maxFuel) &&
      tours > maxFuel
    ) {
      avertissements.push(
        `Relais ${stint.numero} : ${tours} tours dépasse le plein (${maxFuel} tours max).`,
      );
    }

    relais.push({
      ...stint,
      numero: stint.numero,
      piloteId: pilote.id,
      toursPrevus: tours,
      changementPneus: stint.changementPneus,
      heureDebut: timestampMsToClock(curseurMs),
      heureFin: timestampMsToClock(finRelaisMs),
      dureeSecondes,
      carburantUtiliseLitres,
      toursMaxCarburant: Number.isFinite(maxFuel) ? maxFuel : 0,
    });

    curseurMs = finRelaisMs + pitMs;
  }

  avertissements.push(...avertissementsPneus(raceSettings, relais));

  const toursTotaux = relais.reduce((sum, r) => sum + r.toursPrevus, 0);
  const carburantTotalLitres = relais.reduce(
    (sum, r) => sum + (r.carburantUtiliseLitres ?? 0),
    0,
  );
  const dureeConduiteSec = relais.reduce((sum, r) => sum + r.dureeSecondes, 0);
  const dureeTotaleSecondes =
    dureeConduiteSec + Math.max(0, relais.length) * pitSec;

  return {
    ...strategy,
    nombreRelaisTotal: relais.length,
    relais,
    avertissements,
    toursTotaux,
    dureeTotaleSecondes,
    carburantTotalLitres,
  };
}
