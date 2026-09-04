/** Session iRacing lue en arrière-plan pour la préparation endurance. */
export interface EnduranceLiveSession {
  connected: boolean;
  iracingRunning: boolean;
  sessionType: string | null;
  /** Vrai en practice / essais (mesure pit active). */
  isPractice: boolean;
  trackName: string | null;
  carName: string | null;
  pitDurationSec: number;
  pitTimeEstimated: boolean;
  measuredPitStops: number;
  capaciteReservoirLitres: number;
  consommationLitresParHeure: number;
  consommationEstimee: boolean;
  error: string | null;
}

export const DEFAULT_LIVE_SESSION: EnduranceLiveSession = {
  connected: false,
  iracingRunning: false,
  sessionType: null,
  isPractice: false,
  trackName: null,
  carName: null,
  pitDurationSec: 93,
  pitTimeEstimated: true,
  measuredPitStops: 0,
  capaciteReservoirLitres: 100,
  consommationLitresParHeure: 38,
  consommationEstimee: true,
  error: null,
};
