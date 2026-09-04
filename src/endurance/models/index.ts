export type { RaceSettings, RaceDurationType } from "./RaceSettings";
export {
  DEFAULT_RACE_SETTINGS,
  formatRaceDuration,
} from "./RaceSettings";

export type { AbsenceSlot, Driver } from "./Driver";
export { createDriver } from "./Driver";

export type { Stint } from "./Stint";

export type {
  EndurancePlan,
  Strategy,
  StrategyInput,
  StrategyObjective,
} from "./Strategy";

export type { EnduranceLiveSession } from "./LiveSession";
export { DEFAULT_LIVE_SESSION } from "./LiveSession";

export { migrateEndurancePlan } from "./migratePlan";

import { createDriver } from "./Driver";
import { DEFAULT_RACE_SETTINGS } from "./RaceSettings";
import type { EndurancePlan } from "./Strategy";

export function createDefaultPlan(): EndurancePlan {
  return {
    raceSettings: { ...DEFAULT_RACE_SETTINGS },
    drivers: [createDriver(0), createDriver(1), createDriver(2)],
    strategy: null,
    strategyValidatedAt: null,
  };
}
