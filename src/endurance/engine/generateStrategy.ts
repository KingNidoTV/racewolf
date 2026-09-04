import type { Driver } from "../models/Driver";
import type { Stint } from "../models/Stint";
import type { Strategy, StrategyInput } from "../models/Strategy";
import {
  calculerToursOptimaux,
  chronoPilote,
  choisirPiloteOptimal,
  estAbsentPendant,
  estimerDureeRelaisMaxSec,
  peutPlanifierRelais,
  peutPlanifierRelaisTours,
  peutPrendreRelais,
} from "./optimizeStint";
import type { EligibiliteContexte } from "./optimizeStint";
import type { FuelConfig } from "./fuel";
import {
  fuelConfigActive,
  fuelConfigPourPilote,
  litresUtilisesSurRelais,
  toursMaxCarburant,
} from "./fuel";
import {
  isLapBasedRace,
  raceDurationLaps,
  raceDurationSeconds,
} from "./raceDuration";
import { timestampMsToClock, toRaceTimestampMs } from "./time";

function fuelDepuisPilote(
  raceSettings: StrategyInput["raceSettings"],
  pilote: Driver,
): FuelConfig {
  return fuelConfigPourPilote(raceSettings.capaciteReservoirLitres, pilote);
}

function assignerRelais(
  pilote: Driver,
  numeroRelais: number,
  curseurMs: number,
  tours: number,
  dateCourse: string,
  fuel: FuelConfig,
  changementPneus: boolean,
  avertissements: string[],
): { stint: Stint; finRelaisMs: number } | null {
  const chronoSec = chronoPilote(pilote);
  if (chronoSec <= 0 || tours < 1) {
    avertissements.push(`Chrono ou tours invalides pour ${pilote.nom}.`);
    return null;
  }

  const dureeSecondes = tours * chronoSec;
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
      `Relais ${numeroRelais} : ${tours} tours dépasse le plein (${maxFuel} tours max).`,
    );
  }

  if (estAbsentPendant(pilote, dateCourse, curseurMs, finRelaisMs)) {
    avertissements.push(
      `${pilote.nom} serait absent pendant le relais ${numeroRelais}.`,
    );
    return null;
  }

  return {
    stint: {
      numero: numeroRelais,
      heureDebut: timestampMsToClock(curseurMs),
      heureFin: timestampMsToClock(finRelaisMs),
      piloteId: pilote.id,
      toursPrevus: tours,
      dureeSecondes,
      carburantUtiliseLitres,
      toursMaxCarburant: Number.isFinite(maxFuel) ? maxFuel : 0,
      changementPneus,
    },
    finRelaisMs,
  };
}

/**
 * Génère une stratégie optimisée :
 * - Course au temps → maximise le nombre de tours
 * - Course aux tours → minimise le temps total (gros relais, moins de pits)
 */
export function generateStrategy(input: StrategyInput): Strategy {
  const avertissements: string[] = [];
  const { raceSettings, drivers } = input;
  const objectif = isLapBasedRace(raceSettings) ? "min_temps" : "max_tours";

  const strategieVide = (): Strategy => ({
    nombreRelaisTotal: 0,
    relais: [],
    avertissements,
    genereLe: new Date().toISOString(),
    objectif,
    toursTotaux: 0,
    dureeTotaleSecondes: 0,
    carburantTotalLitres: 0,
  });

  if (drivers.length === 0) {
    avertissements.push("Ajoutez au moins un pilote pour générer une stratégie.");
    return strategieVide();
  }

  const pilotesInvalides = drivers.filter((d) => d.chronoSecondes <= 0);
  if (pilotesInvalides.length > 0) {
    avertissements.push(
      `Chronos invalides pour : ${pilotesInvalides.map((d) => d.nom).join(", ")}`,
    );
  }

  const modeLaps = isLapBasedRace(raceSettings);
  const debutCourseMs = toRaceTimestampMs(
    raceSettings.date,
    raceSettings.startTime,
  );
  const finCourseMs = modeLaps
    ? Number.POSITIVE_INFINITY
    : debutCourseMs + raceDurationSeconds(raceSettings) * 1000;
  const pitSec = raceSettings.tempsPitMoyenSecondes;
  const pitMs = pitSec * 1000;
  const toursCourseTotal = modeLaps ? raceDurationLaps(raceSettings) : 0;

  if (raceSettings.capaciteReservoirLitres <= 0) {
    avertissements.push(
      "Renseignez la capacité du réservoir (à côté de la voiture).",
    );
  }

  const pilotesSansConso = drivers.filter((d) => d.consommationLitresParTour <= 0);
  if (pilotesSansConso.length > 0) {
    avertissements.push(
      `Conso L/tour manquante pour : ${pilotesSansConso.map((d) => d.nom).join(", ")}`,
    );
  }

  const relais: Stint[] = [];
  const compteurRelais = new Map<string, number>();
  for (const driver of drivers) {
    compteurRelais.set(driver.id, 0);
  }

  let curseurMs = debutCourseMs;
  let dernierPiloteId: string | null = null;
  let numeroRelais = 1;
  let toursRestants = toursCourseTotal;
  let relaisConsecutifsRestants = 0;
  let piloteBlocId: string | null = null;
  const maxIterations = 500;
  const maxTrainsPneus = raceSettings.trainsPneusIllimites
    ? Number.POSITIVE_INFINITY
    : raceSettings.nombreTrainsPneus;
  let trainsPneusUtilises = 0;

  const contexteEligibilite = (
    curseurMs: number,
    dernierPiloteId: string | null,
  ): EligibiliteContexte => ({
    dateCourse: raceSettings.date,
    debutRelaisMs: curseurMs,
    finRelaisEstimeeMs: curseurMs,
    finRelaisEstimeePour: (driver) => {
      const chronoSec = chronoPilote(driver);
      const fuel = fuelDepuisPilote(raceSettings, driver);
      const dureeSec = estimerDureeRelaisMaxSec(
        chronoSec,
        fuel,
        curseurMs,
        finCourseMs,
        modeLaps,
        toursRestants,
      );
      return curseurMs + Math.max(chronoSec, dureeSec) * 1000;
    },
    dernierPiloteId,
    compteurRelais,
  });

  while (numeroRelais <= maxIterations) {
    const contexte = contexteEligibilite(curseurMs, dernierPiloteId);

    const peutContinuer = modeLaps
      ? peutPlanifierRelaisTours(toursRestants)
      : peutPlanifierRelais(
          drivers,
          curseurMs,
          finCourseMs,
          pitSec,
          contexte,
          relaisConsecutifsRestants,
          piloteBlocId,
        );

    if (!peutContinuer) break;

    let pilote: Driver | null = null;
    let resultat: { stint: Stint; finRelaisMs: number } | null = null;
    const exclusCeRelais = new Set<string>();

    while (exclusCeRelais.size < drivers.length) {
      if (relaisConsecutifsRestants > 0 && piloteBlocId) {
        pilote = drivers.find((d) => d.id === piloteBlocId) ?? null;
        if (!pilote || !peutPrendreRelais(pilote, contexte)) {
          avertissements.push(
            `Impossible d'enchaîner le second relais pour ${pilote?.nom ?? "le pilote"} (relais ${numeroRelais}) — absence ou contrainte.`,
          );
          relaisConsecutifsRestants = 0;
          piloteBlocId = null;
          break;
        }
        relaisConsecutifsRestants -= 1;
      } else {
        pilote =
          choisirPiloteOptimal(drivers, contexte, exclusCeRelais) ??
          (modeLaps
            ? choisirPiloteOptimal(drivers, contexte, exclusCeRelais, {
                allowConsecutive: true,
              })
            : null) ??
          (modeLaps
            ? choisirPiloteOptimal(drivers, contexte, exclusCeRelais, {
                allowConsecutive: true,
                ignoreRelaisMax: true,
              })
            : null);

        if (!pilote) {
          if (exclusCeRelais.size === 0) {
            avertissements.push(
              `Aucun pilote disponible pour le relais ${numeroRelais} (${timestampMsToClock(curseurMs)}).`,
            );
          }
          break;
        }

        if (pilote.doubleRelaisAutorise && !exclusCeRelais.has(pilote.id)) {
          const relaisApres = (compteurRelais.get(pilote.id) ?? 0) + 1;
          if (relaisApres < pilote.relaisMax) {
            piloteBlocId = pilote.id;
            relaisConsecutifsRestants = 1;
          } else {
            avertissements.push(
              `${pilote.nom} : double relais impossible (relais max atteint).`,
            );
          }
        }
      }

      if (!pilote) break;

      const chronoSec = chronoPilote(pilote);
      const fuel = fuelDepuisPilote(raceSettings, pilote);
      const tours = calculerToursOptimaux({
        modeLaps,
        chronoSec,
        fuel,
        curseurMs,
        finCourseMs,
        pitSec,
        toursRestants,
        pilote,
        drivers,
        compteurRelais,
        dateCourse: raceSettings.date,
        contexteEligibilite: contexte,
      });

      if (tours < 1) {
        exclusCeRelais.add(pilote.id);
        relaisConsecutifsRestants = 0;
        piloteBlocId = null;
        continue;
      }

      const changementPneus =
        numeroRelais === 1 || trainsPneusUtilises < maxTrainsPneus;
      if (changementPneus) {
        trainsPneusUtilises += 1;
      }

      resultat = assignerRelais(
        pilote,
        numeroRelais,
        curseurMs,
        tours,
        raceSettings.date,
        fuel,
        changementPneus,
        avertissements,
      );

      if (!resultat) {
        exclusCeRelais.add(pilote.id);
        relaisConsecutifsRestants = 0;
        piloteBlocId = null;
        continue;
      }

      break;
    }

    if (!pilote || !resultat) break;

    relais.push(resultat.stint);
    compteurRelais.set(
      pilote.id,
      (compteurRelais.get(pilote.id) ?? 0) + 1,
    );
    dernierPiloteId = pilote.id;
    curseurMs = resultat.finRelaisMs + pitMs;
    if (modeLaps) {
      toursRestants -= resultat.stint.toursPrevus;
    }
    numeroRelais += 1;

    if (relaisConsecutifsRestants === 0) {
      piloteBlocId = null;
    }
  }

  if (numeroRelais > maxIterations) {
    avertissements.push("Limite de relais atteinte — vérifiez les paramètres.");
  }

  // Course au temps : prolonger le dernier relais jusqu’à dépasser l’heure de fin.
  if (!modeLaps && relais.length > 0 && Number.isFinite(finCourseMs)) {
    const lastIndex = relais.length - 1;
    const last = relais[lastIndex]!;
    const pilote = drivers.find((d) => d.id === last.piloteId);
    const chronoSec = pilote ? chronoPilote(pilote) : 0;
    if (pilote && chronoSec > 0) {
      let debutRelaisMs = debutCourseMs;
      for (let i = 0; i < lastIndex; i++) {
        debutRelaisMs += relais[i]!.dureeSecondes * 1000 + pitMs;
      }
      const finActuelleMs = debutRelaisMs + last.dureeSecondes * 1000;
      if (finActuelleMs < finCourseMs) {
        const besoinSec = (finCourseMs - debutRelaisMs) / 1000;
        const toursCible = Math.max(
          last.toursPrevus,
          Math.ceil(besoinSec / chronoSec),
        );
        const fuel = fuelDepuisPilote(raceSettings, pilote);
        const maxFuel = toursMaxCarburant(fuel);
        const etendu = assignerRelais(
          pilote,
          last.numero,
          debutRelaisMs,
          toursCible,
          raceSettings.date,
          fuel,
          last.changementPneus,
          avertissements,
        );
        if (etendu && etendu.finRelaisMs >= finCourseMs) {
          relais[lastIndex] = etendu.stint;
        } else {
          const toursForce = toursCible;
          const dureeForce = toursForce * chronoSec;
          relais[lastIndex] = {
            ...(etendu?.stint ?? last),
            toursPrevus: toursForce,
            dureeSecondes: dureeForce,
            heureDebut: timestampMsToClock(debutRelaisMs),
            heureFin: timestampMsToClock(debutRelaisMs + dureeForce * 1000),
            carburantUtiliseLitres: fuelConfigActive(fuel)
              ? litresUtilisesSurRelais(
                  toursForce,
                  fuel.consommationLitresParTour,
                )
              : 0,
            toursMaxCarburant: Number.isFinite(maxFuel) ? maxFuel : 0,
          };
          if (Number.isFinite(maxFuel) && toursForce > maxFuel) {
            avertissements.push(
              `Dernier relais prolongé jusqu’à l’heure de fin (${toursForce} tours, plein théorique ${maxFuel}).`,
            );
          }
        }
      }
    }
  }

  const pilotesSansRelais = drivers.filter(
    (d) => (compteurRelais.get(d.id) ?? 0) === 0,
  );
  if (pilotesSansRelais.length > 0) {
    avertissements.push(
      `Pilotes sans relais : ${pilotesSansRelais.map((d) => d.nom).join(", ")} — durée de course insuffisante, absences ou relais max atteint.`,
    );
  }

  if (
    !raceSettings.trainsPneusIllimites &&
    raceSettings.nombreTrainsPneus <= 0
  ) {
    avertissements.push(
      "Aucun train de pneus configuré — les changements seront désactivés.",
    );
  }

  const toursTotaux = relais.reduce((sum, r) => sum + r.toursPrevus, 0);
  const carburantTotalLitres = relais.reduce(
    (sum, r) => sum + (r.carburantUtiliseLitres ?? 0),
    0,
  );
  const dureeConduiteSec = relais.reduce((sum, r) => sum + r.dureeSecondes, 0);
  const dureeTotaleSecondes =
    dureeConduiteSec + Math.max(0, relais.length) * pitSec;

  if (modeLaps) {
    if (toursTotaux < toursCourseTotal) {
      avertissements.push(
        `Objectif : ${toursCourseTotal} tours — seulement ${toursTotaux} tours planifiés (contraintes pilotes).`,
      );
    }
  } else if (toursTotaux === 0) {
    avertissements.push(
      "Impossible de planifier des tours dans la durée de course.",
    );
  }

  return {
    nombreRelaisTotal: relais.length,
    relais,
    avertissements,
    genereLe: new Date().toISOString(),
    objectif,
    toursTotaux,
    dureeTotaleSecondes,
    carburantTotalLitres,
  };
}
