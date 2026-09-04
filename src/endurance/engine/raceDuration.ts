import type { RaceSettings } from "../models/RaceSettings";

/** Durée de course en secondes (mode temps uniquement). */
export function raceDurationSeconds(settings: RaceSettings): number {
  return settings.durationMinutes * 60;
}

/** Nombre total de tours cible (mode tours uniquement). */
export function raceDurationLaps(settings: RaceSettings): number {
  return Math.max(1, settings.durationLaps);
}

export function isLapBasedRace(settings: RaceSettings): boolean {
  return settings.dureeType === "laps";
}
