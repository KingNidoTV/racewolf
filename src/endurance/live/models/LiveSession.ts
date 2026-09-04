/** Drapeau de session en course. */
export type LiveSessionFlag =
  | "green"
  | "yellow"
  | "red"
  | "safety_car"
  | "checkered"
  | "unknown";

/** État météo simplifié pour la stratégie live. */
export type LiveWeatherState = "sec" | "humide" | "mixte";

/** Source des données télémétrie live. */
export type LiveTelemetrySource = "none" | "mock" | "sdk";

/** Session iRacing en cours (course / relais). */
export interface LiveSession {
  /** Identifiant SDK, utilisé pour réinitialiser alertes et état de relais. */
  sessionUniqueId: number;
  connected: boolean;
  iracingRunning: boolean;
  source: LiveTelemetrySource;
  sessionType: string | null;
  isRace: boolean;
  /** Temps de session écoulé (secondes). */
  sessionTimeSec: number;
  /** Tours de session complétés. */
  sessionLaps: number;
  flag: LiveSessionFlag;
  weather: LiveWeatherState;
  trackTempCelsius: number | null;
  airTempCelsius: number | null;
  /** 0 = sec, 100 = pluie forte. */
  rainIntensityPercent: number;
  /** Libellé ciel iRacing (dégagé, nuageux…). */
  cielLabel: string | null;
  /** Libellé humidité piste iRacing. */
  pisteHumiditeLabel: string | null;
  /** Temps restant session (secondes), si course au temps. */
  sessionTimeRemainingSec: number | null;
  /** Tours restants session, si course aux tours. */
  sessionLapsRemaining: number | null;
  /** Heure in-game (HH:mm). */
  gameClock: string | null;
  trackName: string | null;
  carName: string | null;
  /** Nom pilote iRacing (session courante). */
  driverName: string | null;
  /** Secondes restantes de réparation en pit (0 = pas de réparation). */
  repairTimeLeftSec: number;
  error: string | null;
  updatedAt: string;
}

export const DEFAULT_LIVE_SESSION: LiveSession = {
  sessionUniqueId: -1,
  connected: false,
  iracingRunning: false,
  source: "none",
  sessionType: null,
  isRace: false,
  sessionTimeSec: 0,
  sessionLaps: 0,
  flag: "unknown",
  weather: "sec",
  trackTempCelsius: null,
  airTempCelsius: null,
  rainIntensityPercent: 0,
  cielLabel: null,
  pisteHumiditeLabel: null,
  sessionTimeRemainingSec: null,
  sessionLapsRemaining: null,
  gameClock: null,
  trackName: null,
  carName: null,
  driverName: null,
  repairTimeLeftSec: 0,
  error: null,
  updatedAt: new Date(0).toISOString(),
};
