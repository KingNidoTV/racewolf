/** Paramètres optionnels pour un recalcul live. */
export interface LiveRecalcPayload {
  /** Retard ajouté (réparation, SC, etc.), en secondes. */
  retardSecondes?: number;
  /** Multiplicateur de chrono sur les relais restants (météo). */
  facteurChrono?: number;
  /** Multiplicateur de conso carburant sur les relais restants. */
  facteurCarburant?: number;
  /** Nouvelle météo après changement. */
  weather?: import("./models").LiveWeatherState;
}

export const LIVE_RECALC_DELAYS = {
  repair: 90,
  safety_car: 180,
} as const;

export const LIVE_WEATHER_FACTORS: Record<
  import("./models").LiveWeatherState,
  { chrono: number; carburant: number }
> = {
  sec: { chrono: 1, carburant: 1 },
  mixte: { chrono: 1.04, carburant: 1.06 },
  humide: { chrono: 1.1, carburant: 1.12 },
};
