import type { Driver } from "../models/Driver";
import type { FuelConfig } from "./fuel";
import { toursMaxCarburant } from "./fuel";
import { absenceIntervalMs, intervalsOverlap } from "./time";

/** Durée max d'un relais (fenêtre carburant / pneus typique). */
export const DUREE_RELAIS_MAX_SEC = 90 * 60;

export function chronoPilote(driver: Driver): number {
  return driver.chronoSecondes;
}

export interface EligibiliteContexte {
  dateCourse: string;
  debutRelaisMs: number;
  /** Estimation de fin de relais si pas de calcul par pilote. */
  finRelaisEstimeeMs: number;
  /** Fin de relais estimée selon la durée max possible du pilote. */
  finRelaisEstimeePour?: (driver: Driver) => number;
  dernierPiloteId: string | null;
  compteurRelais: Map<string, number>;
}

function finRelaisEstimeeMs(
  contexte: Pick<
    EligibiliteContexte,
    "debutRelaisMs" | "finRelaisEstimeeMs" | "finRelaisEstimeePour"
  >,
  driver: Driver,
): number {
  return contexte.finRelaisEstimeePour?.(driver) ?? contexte.finRelaisEstimeeMs;
}

export function estAbsentPendant(
  driver: Driver,
  dateCourse: string,
  debutMs: number,
  finMs: number,
): boolean {
  return driver.absences.some((absence) => {
    const { debutMs: absDebut, finMs: absFin } = absenceIntervalMs(
      dateCourse,
      absence.debut,
      absence.fin,
    );
    return intervalsOverlap(debutMs, finMs, absDebut, absFin);
  });
}

/** Nombre max de tours sans chevaucher une absence. */
export function toursMaxSansAbsence(
  pilote: Driver,
  dateCourse: string,
  debutMs: number,
  chronoSec: number,
  toursMax: number,
): number {
  if (chronoSec <= 0 || toursMax < 1) return 0;
  if (pilote.absences.length === 0) return toursMax;

  for (let tours = toursMax; tours >= 1; tours -= 1) {
    const finMs = debutMs + tours * chronoSec * 1000;
    if (!estAbsentPendant(pilote, dateCourse, debutMs, finMs)) {
      return tours;
    }
  }
  return 0;
}

export function peutPrendreRelais(
  driver: Driver,
  contexte: Pick<
    EligibiliteContexte,
    | "dateCourse"
    | "debutRelaisMs"
    | "finRelaisEstimeeMs"
    | "finRelaisEstimeePour"
    | "compteurRelais"
  >,
): boolean {
  const relaisFaits = contexte.compteurRelais.get(driver.id) ?? 0;
  if (relaisFaits >= driver.relaisMax) return false;
  return !estAbsentPendant(
    driver,
    contexte.dateCourse,
    contexte.debutRelaisMs,
    finRelaisEstimeeMs(contexte, driver),
  );
}

export function estEligiblePourNouveauBloc(
  driver: Driver,
  contexte: EligibiliteContexte,
): boolean {
  if (contexte.dernierPiloteId === driver.id) return false;
  return peutPrendreRelais(driver, contexte);
}

/** Pilote pour le prochain relais : tous roulent et les relais sont répartis. */
export function choisirPiloteOptimal(
  drivers: Driver[],
  contexte: EligibiliteContexte,
  exclus: ReadonlySet<string> = new Set(),
  options?: { allowConsecutive?: boolean; ignoreRelaisMax?: boolean },
): Driver | null {
  const allowConsecutive = options?.allowConsecutive === true;
  const ignoreRelaisMax = options?.ignoreRelaisMax === true;

  const eligibles = drivers.filter((d) => {
    if (exclus.has(d.id)) return false;
    if (allowConsecutive) {
      if (!ignoreRelaisMax) {
        const relaisFaits = contexte.compteurRelais.get(d.id) ?? 0;
        if (relaisFaits >= d.relaisMax) return false;
      }
      return !estAbsentPendant(
        d,
        contexte.dateCourse,
        contexte.debutRelaisMs,
        finRelaisEstimeeMs(contexte, d),
      );
    }
    return estEligiblePourNouveauBloc(d, contexte);
  });
  if (eligibles.length === 0) return null;

  const relaisCount = (id: string) => contexte.compteurRelais.get(id) ?? 0;
  const sansRelais = eligibles.filter((d) => relaisCount(d.id) === 0);

  const pool = sansRelais.length > 0 ? sansRelais : eligibles;

  return pool.reduce((meilleur, candidat) => {
    const relaisM = relaisCount(meilleur.id);
    const relaisC = relaisCount(candidat.id);
    if (relaisC < relaisM) return candidat;
    if (relaisC > relaisM) return meilleur;

    const chronoM = chronoPilote(meilleur);
    const chronoC = chronoPilote(candidat);
    if (chronoC > chronoM) return candidat;
    if (chronoC < chronoM) return meilleur;
    return candidat.nom.localeCompare(meilleur.nom) < 0 ? candidat : meilleur;
  });
}

export function estimerDureeRelaisMaxSec(
  chronoSec: number,
  fuel: FuelConfig,
  debutMs: number,
  finCourseMs: number,
  modeLaps: boolean,
  toursRestants: number,
): number {
  if (chronoSec <= 0) return 0;

  const capCarburant = toursMaxCarburant(fuel);
  const capTemps = Math.max(1, Math.floor(DUREE_RELAIS_MAX_SEC / chronoSec));
  let maxTours = Math.min(
    capTemps,
    Number.isFinite(capCarburant) ? capCarburant : capTemps,
  );
  if (modeLaps) {
    maxTours = Math.min(maxTours, toursRestants);
  }

  let dureeSec = maxTours * chronoSec;
  if (!modeLaps) {
    const budget = (finCourseMs - debutMs) / 1000;
    dureeSec = Math.min(dureeSec, Math.max(0, budget));
  }
  return dureeSec;
}

function pilotesEligiblesApresRelais(
  drivers: Driver[],
  contexte: EligibiliteContexte,
  piloteCourantId: string,
  curseurApresPitMs: number,
): Driver[] {
  return drivers.filter((d) =>
    estEligiblePourNouveauBloc(d, {
      ...contexte,
      debutRelaisMs: curseurApresPitMs,
      dernierPiloteId: piloteCourantId,
    }),
  );
}

/**
 * Mode durée : maximise les tours dans le temps restant.
 * Mode tours : minimise le nombre de relais (gros relais, moins de pits).
 */
export function calculerToursOptimaux(params: {
  modeLaps: boolean;
  chronoSec: number;
  fuel: FuelConfig;
  curseurMs: number;
  finCourseMs: number;
  pitSec: number;
  toursRestants: number;
  pilote: Driver;
  drivers: Driver[];
  compteurRelais: Map<string, number>;
  dateCourse: string;
  contexteEligibilite?: EligibiliteContexte;
}): number {
  const {
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
    dateCourse,
    contexteEligibilite,
  } = params;

  const capCarburant = toursMaxCarburant(fuel);
  const capTemps = Math.max(
    1,
    Math.floor(DUREE_RELAIS_MAX_SEC / chronoSec),
  );
  const capPhysique = Math.min(
    capTemps,
    Number.isFinite(capCarburant) ? capCarburant : capTemps,
  );

  let tours = modeLaps
    ? Math.min(toursRestants, capPhysique)
    : (() => {
        const budgetConduiteSec = (finCourseMs - curseurMs) / 1000 - pitSec;
        const toursMaxBudget = Math.floor(budgetConduiteSec / chronoSec);
        if (toursMaxBudget < 1) return 0;

        const curseurApresPitMs =
          curseurMs + capPhysique * chronoSec * 1000 + pitSec * 1000;
        const contexteApres: EligibiliteContexte = contexteEligibilite ?? {
          dateCourse,
          debutRelaisMs: curseurApresPitMs,
          finRelaisEstimeeMs: curseurApresPitMs + chronoSec * 1000,
          dernierPiloteId: pilote.id,
          compteurRelais,
        };
        const eligiblesApres = pilotesEligiblesApresRelais(
          drivers,
          contexteApres,
          pilote.id,
          curseurApresPitMs,
        );

        if (eligiblesApres.length === 0) {
          return Math.max(1, Math.min(toursMaxBudget, capPhysique));
        }

        return Math.max(1, Math.min(toursMaxBudget, capPhysique));
      })();

  tours = toursMaxSansAbsence(
    pilote,
    dateCourse,
    curseurMs,
    chronoSec,
    tours,
  );

  return tours;
}

export function peutPlanifierRelais(
  drivers: Driver[],
  curseurMs: number,
  finCourseMs: number,
  pitSec: number,
  contexte: EligibiliteContexte,
  relaisConsecutifsRestants: number,
  piloteBlocId: string | null,
): boolean {
  if (relaisConsecutifsRestants > 0 && piloteBlocId) {
    const pilote = drivers.find((d) => d.id === piloteBlocId);
    if (!pilote) return false;
    const chrono = chronoPilote(pilote);
    const budget = (finCourseMs - curseurMs) / 1000 - pitSec;
    if (budget < chrono) return false;
    return peutPrendreRelais(pilote, {
      ...contexte,
      debutRelaisMs: curseurMs,
    });
  }

  const eligibles = drivers.filter((d) =>
    estEligiblePourNouveauBloc(d, {
      ...contexte,
      debutRelaisMs: curseurMs,
    }),
  );
  if (eligibles.length === 0) return false;

  const minChrono = Math.min(...eligibles.map((d) => chronoPilote(d)));
  const budget = (finCourseMs - curseurMs) / 1000 - pitSec;
  return budget >= minChrono;
}

export function peutPlanifierRelaisTours(
  toursRestants: number,
): boolean {
  return toursRestants > 0;
}
