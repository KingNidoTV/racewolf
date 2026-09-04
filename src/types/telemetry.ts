import type { StrategyLive, StrategySessionInfo } from "./strategy";

/** Couleurs classement : primary=blanc, alternate=rouge, wet=bleu. */
export type TireCompound = "primary" | "alternate" | "wet";

export type TrackFlagKind =
  | "checkered"
  | "red"
  | "yellow-waving"
  | "yellow"
  | "caution"
  | "one-lap-green"
  | "green"
  | "white"
  | "blue"
  | "black"
  | "surface"
  | "start";

export interface TrackFlagState {
  kind: TrackFlagKind;
  label: string;
  /** Sous-ligne optionnelle (ex. secteur du drapeau jaune). */
  subLabel?: string | null;
}

export interface SessionInfo {
  series: string;
  track: string;
  sessionType: string;
  /** Titre affiché en tête du panneau classement */
  raceTitle: string;
  timeRemaining: string;
  /** 0–1 : progression de la session (barre) */
  sessionProgress: number;
  lap: number;
  lapsTotal: number | null;
  /** Session course avant le vert : classement = grille de départ. */
  isStartingGrid?: boolean;
}

/** Indicateur individuel à droite de la ligne. */
export type DriverStatusIndicator = "box" | "penalty" | "damage";

export interface StandingsEntry {
  position: number;
  carNumber: string;
  name: string;
  carBrand: string;
  carColor: string;
  nationality: string;
  /** Meilleur temps (surtout P1) */
  bestTime: string;
  /** Écart au leader */
  gap: string;
  /** Dernier tour (relatif). */
  lastLap?: string;
  tireCompound: TireCompound;
  /** Tours effectués sur le relais en cours */
  stintLaps: number;
  /** Aux stands (affiche BOX à la place du pneu). */
  inPits?: boolean;
  /** Drapeau noir — pénalité iRacing. */
  hasPenalty?: boolean;
  /** Drapeau noir/orange — réparation / dégâts. */
  hasDamage?: boolean;
  /** @deprecated Préférer inPits / hasPenalty / hasDamage */
  status?: DriverStatusIndicator | null;
  /** Garage / P-Q : chronos secteurs du meilleur tour. */
  bestLapSectorTimes?: string[];
  /** Practice / qualif : couleur des barres secteur (meilleur tour). */
  bestLapSectorStatus?: SectorStatus[];
  /** Garage : infos sous le nom (tours, etc.). */
  garageMeta?: string;
  isPlayer?: boolean;
  /** Meilleur tour de la session (tous pilotes). */
  isSessionFastest?: boolean;
  /** Faux si le pilote a quitté la session (position 0 / ReasonOut). */
  isConnected?: boolean;
  /** ID catégorie iRacing (multi-class). */
  classId?: number;
  /** Nom court de la catégorie (GT3, GT4…). */
  className?: string;
  /** Position dans la catégorie. */
  classPosition?: number;
  /** Vitesse relative iRacing de la catégorie (plus élevé = plus rapide). */
  classRelSpeed?: number;
}

/** Vert = amélioration perso, violet = record secteur, orange = pas d’amélioration */
export type SectorStatus = "personal" | "record" | "slower" | "pending";

export interface RecentLapEntry {
  lapNumber: number;
  lapTime: string;
  /** Écart au tour précédent (chronologique). */
  deltaToPrevious: string;
}

export interface TimingInfo {
  bestLap: string;
  lastLap: string;
  /** Nombre de secteurs iRacing pour ce circuit (SplitTimeInfo). */
  sectorCount: number;
  sectorTimes: string[];
  sectorStatus: SectorStatus[];
  recentLaps: RecentLapEntry[];
}

export interface TrackMapCar {
  carIdx: number;
  position: number;
  carNumber: string;
  lapDistPct: number;
  carColor: string;
  isPlayer?: boolean;
  onPit?: boolean;
  /** Leader de sa catégorie (ClassPosition = 1). */
  isClassLeader?: boolean;
  /** ID catégorie iRacing (multi-class). */
  classId?: number;
  /** Vitesse relative de la catégorie. */
  classRelSpeed?: number;
}

/** Projection du joueur après le temps moyen d'un passage aux pits. */
export interface TrackMapPitGhost {
  lapDistPct: number;
  active: boolean;
}

export interface TrackMapData {
  trackId: number;
  trackSlug: string;
  trackName: string;
  /** Position grille / ligne de départ (0–1 le long du tracé). */
  startFinishPct: number;
  /**
   * Débuts de secteurs (0–1) dans le même espace que `cars.lapDistPct`
   * (après éventuelle inversion d’affichage).
   */
  sectorStartPcts?: number[];
  /** Bornes officielles SplitTimeInfo (LapDistPct iRacing brut). */
  sectorStartPctsGame?: number[];
  /** LapDistPct joueur brut (espace iRacing), pour radio / secteurs. */
  playerLapDistPctGame?: number;
  cars: TrackMapCar[];
  pitGhost: TrackMapPitGhost | null;
}

export interface AthHud {
  speedKmh: number;
  gear: number;
  rpm: number;
  maxRpm: number;
  fuelLiters: number;
  fuelPercent: number;
  /** Tours restants estimés (moyenne L/tour sur tours complets). */
  fuelLapsRemaining: number | null;
  /** 0–1 */
  throttle: number;
  /** 0–1 */
  brake: number;
  /** 0–1 pédale embrayage */
  clutch: number;
  drsAvailable: boolean;
  drsActive: boolean;
  /** Hybride / ERS — absent si non applicable */
  batteryPercent: number | null;
  /** Push-to-pass — absent si non applicable */
  pushToPassPercent: number | null;
  /** Température eau moteur (°C) */
  waterTempC: number | null;
  /** Température huile moteur (°C) */
  oilTempC: number | null;
}

export interface WeatherInfo {
  airTempC: number;
  trackTempC: number;
  skiesLabel: string;
  trackWetnessLabel: string;
  /** Alerte pluie prévue (null = rien à signaler) */
  rainAlert: string | null;
}

export interface StintLapEntry {
  lapNumber: number;
  lapTime: string;
  deltaToAvg: string;
}

export interface StintLapSummary {
  laps: StintLapEntry[];
  averageLap: string;
}

export interface TireWearCorners {
  lf: number;
  rf: number;
  lr: number;
  rr: number;
}

export interface TireWearInfo {
  corners: TireWearCorners;
  /** Vie restante moyenne 0–100 */
  averagePercent: number;
}

export interface GarageRow {
  position: number;
  carNumber: string;
  carBrand: string;
  carColor: string;
  nationality: string;
  driverName: string;
  bestTime: string;
  gap: string;
  /** Chronos secteurs du meilleur tour. */
  bestLapSectorTimes: string[];
  /** Vert = secteur perso ; violet = meilleur secteur de session. */
  bestLapSectorStatus: SectorStatus[];
  lapsCompleted: number;
  lapsLastStint: number;
  bestLapNumber: number;
  tireCompound: TireCompound;
  status?: DriverStatusIndicator | null;
  isPlayer?: boolean;
  classId?: number;
  className?: string;
  classPosition?: number;
  classRelSpeed?: number;
}

export interface RacingTelemetry {
  session: SessionInfo;
  /** Drapeau piste actif (jaune, vert, damier…). */
  trackFlag: TrackFlagState | null;
  standings: StandingsEntry[];
  timing: TimingInfo;
  trackMap: TrackMapData;
  /** Mêmes entrées que le classement ; filtrées côté UI (±2 autour du pilote). */
  relative: StandingsEntry[];
  ath: AthHud;
  strategySession: StrategySessionInfo;
  strategyLive: StrategyLive;
}

export interface GarageTelemetry {
  sectorCount: number;
  rows: GarageRow[];
  /** Course pas encore partie : lignes ordonnées selon la grille. */
  isStartingGrid?: boolean;
  weather: WeatherInfo;
  stintLaps: StintLapSummary;
  tireWear: TireWearInfo;
  strategySession: StrategySessionInfo;
  strategyLive: StrategyLive;
}

export type TelemetryState = RacingTelemetry | GarageTelemetry;

export function isRacingTelemetry(
  data: TelemetryState,
): data is RacingTelemetry {
  return "ath" in data;
}
