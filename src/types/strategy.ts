/** Infos course (iRacing quand dispo). */
export interface StrategySessionInfo {
  date: string;
  startTime: string;
  duration: string;
  car: string;
  track: string;
  pitTime: string;
  /** Vrai si le temps pit est encore la valeur par défaut (< 2 arrêts mesurés). */
  pitTimeEstimated?: boolean;
}

export interface StrategyDriverConfig {
  id: string;
  name: string;
  color: string;
  /** Tours prévus par relais pour ce pilote. */
  lapsPerStint: number;
}

export interface StrategyStintRow {
  stintNumber: number;
  /** Heure de début du relais (calculée). */
  startTime: string;
  /** Temps de course restant au début du relais. */
  sessionTimeAtStart: string;
  /** Durée estimée du relais. */
  stintDuration: string;
  plannedLaps: number;
  /** Temps restant après le relais (estimé). */
  sessionTimeAfter: string;
  driverId: string;
  weatherChange: boolean;
  tireChange: boolean;
  lapsCompleted: number | null;
  repairTime: string;
  isActive: boolean;
  isDone: boolean;
}

export interface StrategyPlan {
  drivers: StrategyDriverConfig[];
  session: StrategySessionInfo;
  stints: StrategyStintRow[];
  remarks: string;
}

/** État live SDK pour mettre à jour le tableau. */
export interface StrategyLive {
  activeStintIndex: number;
  currentStintLaps: number;
  /** Temps passé sur le relais en cours (secondes). */
  stintTimeSec: number;
  sessionTimeRemaining: string;
  /** Meilleur tour pilote (secondes) pour estimer les durées. */
  avgLapSec: number;
  repairTimeSec: number;
  weatherChange: boolean;
}
