import { recalculerStrategie } from "../engine";
import type { Driver, EndurancePlan } from "../models";
import { chronoPilote } from "../engine/optimizeStint";
import {
  fuelConfigPourPilote,
  litresUtilisesSurRelais,
  toursMaxCarburant,
} from "../engine/fuel";
import { timestampMsToClock, toRaceTimestampMs } from "../engine/time";
import type { Stint } from "../models/Stint";
import type { LiveRecalcPayload } from "./liveEvents";
import { LIVE_RECALC_DELAYS, LIVE_WEATHER_FACTORS } from "./liveEvents";
import type {
  LiveRaceSnapshot,
  LiveRecalcTrigger,
  LiveStrategy,
  LiveWeatherState,
} from "./models";
import { DEFAULT_LIVE_STRATEGY } from "./models";

export interface LiveRecalcState {
  retardCumuleSecondes: number;
  facteurChrono: number;
  facteurCarburant: number;
  weather: LiveWeatherState;
}

export const DEFAULT_LIVE_RECALC_STATE: LiveRecalcState = {
  retardCumuleSecondes: 0,
  facteurChrono: 1,
  facteurCarburant: 1,
  weather: "sec",
};

function driverById(drivers: Driver[], id: string): Driver | undefined {
  return drivers.find((d) => d.id === id);
}

function appliquerFacteursRelais(
  relais: Stint[],
  drivers: Driver[],
  raceSettings: EndurancePlan["raceSettings"],
  relaisActuel: number,
  state: LiveRecalcState,
  debutCourseMs: number,
  pitMs: number,
): Stint[] {
  const retardMs = state.retardCumuleSecondes * 1000;
  let curseurMs = debutCourseMs + retardMs;

  return relais.map((stint, index) => {
    const relaisIndex = index + 1;
    const pilote = driverById(drivers, stint.piloteId);
    const chronoBase = pilote ? chronoPilote(pilote) : stint.dureeSecondes / Math.max(1, stint.toursPrevus);
    const chronoSec =
      relaisIndex >= relaisActuel
        ? chronoBase * state.facteurChrono
        : chronoBase;
    const tours = stint.toursPrevus;
    const dureeSecondes = tours * chronoSec;

    const fuel = pilote
      ? fuelConfigPourPilote(raceSettings.capaciteReservoirLitres, pilote)
      : null;
    const conso =
      fuel && relaisIndex >= relaisActuel
        ? fuel.consommationLitresParTour * state.facteurCarburant
        : fuel?.consommationLitresParTour ?? 0;
    const carburantUtiliseLitres =
      conso > 0 ? litresUtilisesSurRelais(tours, conso) : stint.carburantUtiliseLitres;
    const maxFuel = fuel ? toursMaxCarburant(fuel) : stint.toursMaxCarburant;

    const finRelaisMs = curseurMs + dureeSecondes * 1000;
    const next: Stint = {
      ...stint,
      heureDebut: timestampMsToClock(curseurMs),
      heureFin: timestampMsToClock(finRelaisMs),
      dureeSecondes,
      carburantUtiliseLitres,
      toursMaxCarburant: Number.isFinite(maxFuel) ? maxFuel : stint.toursMaxCarburant,
    };
    curseurMs = finRelaisMs + pitMs;
    return next;
  });
}

function buildAvertissements(
  plan: EndurancePlan,
  relaisProjete: Stint[],
  state: LiveRecalcState,
  trigger: LiveRecalcTrigger,
): string[] {
  const msgs: string[] = [];
  if (state.retardCumuleSecondes > 0) {
    msgs.push(
      `Retard cumulé : ${Math.round(state.retardCumuleSecondes)} s (dernier événement : ${trigger}).`,
    );
  }
  if (state.facteurChrono !== 1 || state.facteurCarburant !== 1) {
    msgs.push(
      `Météo ${state.weather} — chrono ×${state.facteurChrono.toFixed(2)}, carburant ×${state.facteurCarburant.toFixed(2)} sur les relais restants.`,
    );
  }
  if (!plan.strategyValidatedAt) {
    msgs.push("Stratégie non validée — projection indicative uniquement.");
  }
  const changementsPneus = relaisProjete.filter((r) => r.changementPneus).length;
  if (
    !plan.raceSettings.trainsPneusIllimites &&
    changementsPneus > plan.raceSettings.nombreTrainsPneus
  ) {
    msgs.push(
      `Stock pneus insuffisant (${changementsPneus} changements pour ${plan.raceSettings.nombreTrainsPneus} trains).`,
    );
  }
  return msgs;
}

export function appliquerDeclencheurRecalcul(
  state: LiveRecalcState,
  trigger: LiveRecalcTrigger,
  payload?: LiveRecalcPayload,
): LiveRecalcState {
  const next = { ...state };

  switch (trigger) {
    case "repair":
      next.retardCumuleSecondes +=
        payload?.retardSecondes ?? LIVE_RECALC_DELAYS.repair;
      break;
    case "safety_car":
      next.retardCumuleSecondes +=
        payload?.retardSecondes ?? LIVE_RECALC_DELAYS.safety_car;
      break;
    case "weather_change": {
      const weather = payload?.weather ?? next.weather;
      const factors = LIVE_WEATHER_FACTORS[weather];
      next.weather = weather;
      next.facteurChrono = payload?.facteurChrono ?? factors.chrono;
      next.facteurCarburant = payload?.facteurCarburant ?? factors.carburant;
      break;
    }
    default:
      break;
  }

  if (payload?.retardSecondes != null && trigger === "manual") {
    next.retardCumuleSecondes += payload.retardSecondes;
  }

  return next;
}

export function recalculerStrategieLive(
  plan: EndurancePlan,
  snapshot: LiveRaceSnapshot,
  trigger: LiveRecalcTrigger,
  recalcState: LiveRecalcState,
): { strategy: LiveStrategy; recalcState: LiveRecalcState } {
  if (!plan.strategy) {
    return {
      strategy: {
        ...DEFAULT_LIVE_STRATEGY,
        avertissements: ["Aucune stratégie de base — générez et validez un plan."],
        dernierDeclencheur: trigger,
        dernierRecalcul: new Date().toISOString(),
      },
      recalcState,
    };
  }

  const relaisActuel = snapshot.stint.numeroRelais || 1;
  const base = recalculerStrategie(plan.raceSettings, plan.drivers, plan.strategy);
  const debutCourseMs = toRaceTimestampMs(
    plan.raceSettings.date,
    plan.raceSettings.startTime,
  );
  const pitMs = plan.raceSettings.tempsPitMoyenSecondes * 1000;

  const relaisProjete = appliquerFacteursRelais(
    base.relais,
    plan.drivers,
    plan.raceSettings,
    relaisActuel,
    recalcState,
    debutCourseMs,
    pitMs,
  );

  const dureePlan = plan.strategy.dureeTotaleSecondes;
  const dureeProjete =
    relaisProjete.reduce((s, r) => s + r.dureeSecondes, 0) +
    relaisProjete.length * plan.raceSettings.tempsPitMoyenSecondes;

  const strategy: LiveStrategy = {
    strategieValidee: Boolean(plan.strategyValidatedAt),
    relaisActuel,
    relaisProjete,
    retardSecondes: recalcState.retardCumuleSecondes,
    dernierRecalcul: new Date().toISOString(),
    dernierDeclencheur: trigger,
    avertissements: buildAvertissements(plan, relaisProjete, recalcState, trigger),
    ecartPlanSecondes: dureeProjete - dureePlan + recalcState.retardCumuleSecondes,
  };

  return { strategy, recalcState };
}
