import type { Driver } from "../models/Driver";
import type { LiveFuel, LiveStint, LiveStintLapDelta } from "./models";

export interface LiveDeltaState {
  lastLapCompleted: number;
  fuelAtLastLap: number;
  numeroRelais: number;
  historiqueTours: LiveStintLapDelta[];
  deltaCumuleeTempsSec: number;
  deltaCumuleeConsoLitres: number;
  deltaDernierTourSec: number | null;
  deltaDernierTourConsoLitres: number | null;
}

export function createLiveDeltaState(): LiveDeltaState {
  return {
    lastLapCompleted: -1,
    fuelAtLastLap: 0,
    numeroRelais: 0,
    historiqueTours: [],
    deltaCumuleeTempsSec: 0,
    deltaCumuleeConsoLitres: 0,
    deltaDernierTourSec: null,
    deltaDernierTourConsoLitres: null,
  };
}

function findDriver(drivers: Driver[], piloteId: string | null): Driver | undefined {
  if (!piloteId) return undefined;
  return drivers.find((d) => d.id === piloteId);
}

function formatDeltaSec(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)} s`;
}

function formatDeltaLitres(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)} L`;
}

/** Calcule écarts temps / carburant tour par tour vs plan pilote. */
export function enrichLiveDeltas(
  stint: LiveStint,
  fuel: LiveFuel,
  drivers: Driver[],
  state: LiveDeltaState,
): { stint: LiveStint; fuel: LiveFuel; state: LiveDeltaState } {
  const driver = findDriver(drivers, stint.piloteId);
  const chronoPrevu = driver?.chronoSecondes ?? 0;
  const consoPrevue = driver?.consommationLitresParTour ?? 0;

  let nextState = { ...state };
  const stintKey = stint.sdkStintIndex ?? stint.numeroRelais;
  if (stintKey !== state.numeroRelais) {
    nextState = createLiveDeltaState();
    nextState.numeroRelais = stintKey;
    nextState.fuelAtLastLap = fuel.niveauLitres;
  }

  const historique = [...nextState.historiqueTours];

  if (
    stint.toursCompletes > nextState.lastLapCompleted &&
    stint.dernierTourSecondes > 0 &&
    chronoPrevu > 0
  ) {
    const deltaTemps = stint.dernierTourSecondes - chronoPrevu;
    const fuelUsed =
      nextState.lastLapCompleted >= 0
        ? Math.max(0, nextState.fuelAtLastLap - fuel.niveauLitres)
        : 0;
    const deltaConso =
      consoPrevue > 0 && nextState.lastLapCompleted >= 0
        ? fuelUsed - consoPrevue
        : 0;

    nextState.deltaDernierTourSec = deltaTemps;
    nextState.deltaCumuleeTempsSec += deltaTemps;
    nextState.deltaDernierTourConsoLitres =
      nextState.lastLapCompleted >= 0 ? deltaConso : null;
    if (nextState.lastLapCompleted >= 0) {
      nextState.deltaCumuleeConsoLitres += deltaConso;
    }

    historique.push({
      numeroTour: stint.toursCompletes,
      tourSecondes: stint.dernierTourSecondes,
      deltaTempsSec: deltaTemps,
      deltaConsoLitres: deltaConso,
    });
    if (historique.length > 12) {
      historique.shift();
    }

    nextState = {
      ...nextState,
      lastLapCompleted: stint.toursCompletes,
      fuelAtLastLap: fuel.niveauLitres,
      historiqueTours: historique,
    };
  }

  return {
    stint: {
      ...stint,
      deltaDernierTourSec: nextState.deltaDernierTourSec,
      deltaCumuleeTempsSec: nextState.deltaCumuleeTempsSec,
      deltaDernierTourConsoLitres: nextState.deltaDernierTourConsoLitres,
      deltaCumuleeConsoLitres: nextState.deltaCumuleeConsoLitres,
      historiqueTours: nextState.historiqueTours,
      deltaDernierTourLabel:
        nextState.deltaDernierTourSec != null
          ? formatDeltaSec(nextState.deltaDernierTourSec)
          : null,
      deltaCumuleeTempsLabel: formatDeltaSec(nextState.deltaCumuleeTempsSec),
    },
    fuel: {
      ...fuel,
      consoPrevueLitresParTour: consoPrevue,
      deltaDernierTourConsoLitres: nextState.deltaDernierTourConsoLitres,
      deltaCumuleeConsoLitres: nextState.deltaCumuleeConsoLitres,
      deltaDernierTourConsoLabel:
        nextState.deltaDernierTourConsoLitres != null
          ? formatDeltaLitres(nextState.deltaDernierTourConsoLitres)
          : null,
      deltaCumuleeConsoLabel: formatDeltaLitres(nextState.deltaCumuleeConsoLitres),
    },
    state: nextState,
  };
}
