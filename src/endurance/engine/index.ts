export { generateStrategy } from "./generateStrategy";
export { recalculerStrategie } from "./recalculateStrategy";
export {
  fuelConfigActive,
  formatLitresParTour,
  litresParTourDepuisLph,
  litresUtilisesSurRelais,
  roundConsommationLitresParTour,
  toursMaxCarburant,
} from "./fuel";
export type { FuelConfig } from "./fuel";
export {
  isLapBasedRace,
  raceDurationLaps,
  raceDurationSeconds,
} from "./raceDuration";
export {
  canValidateStrategyForLive,
  getStrategyLiveReadiness,
} from "./strategyLiveReadiness";
export type { StrategyLiveReadiness } from "./strategyLiveReadiness";
export {
  formatDurationMinutes,
  formatSecondsToClock,
  formatSecondsToLapTime,
  parseClockToSeconds,
  parseLapTimeToSeconds,
} from "./time";
