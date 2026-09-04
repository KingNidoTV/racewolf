import type { RaceSettings } from "../models/RaceSettings";
import type { Strategy } from "../models/Strategy";
import {
  isLapBasedRace,
  raceDurationLaps,
  raceDurationSeconds,
} from "./raceDuration";
import { parseClockToSeconds, toRaceTimestampMs } from "./time";

export interface StrategyLiveReadiness {
  ok: boolean;
  reason: string | null;
}

/** Timestamp absolu d’une horloge HH:mm[:ss] le jour de course, ≥ afterMs. */
function clockToAbsoluteMs(
  dateIso: string,
  clock: string,
  afterMs: number,
): number {
  const base = toRaceTimestampMs(dateIso, clock.slice(0, 5));
  const secPart = parseClockToSeconds(clock) % 60;
  let ms = base + secPart * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  while (ms + 500 < afterMs) {
    ms += dayMs;
  }
  return ms;
}

/**
 * Critères pour activer le Live :
 * - Course en tours : tours planifiés ≥ objectif
 * - Course au temps : heure de fin du dernier relais ≥ heure de fin de course
 */
export function getStrategyLiveReadiness(
  raceSettings: RaceSettings,
  strategy: Strategy | null | undefined,
): StrategyLiveReadiness {
  if (!strategy || strategy.relais.length === 0) {
    return {
      ok: false,
      reason: "Générez une stratégie avant de valider le Live.",
    };
  }

  if (isLapBasedRace(raceSettings)) {
    const target = raceDurationLaps(raceSettings);
    const planned =
      strategy.toursTotaux ||
      strategy.relais.reduce((sum, r) => sum + r.toursPrevus, 0);
    if (planned < target) {
      const missing = target - planned;
      return {
        ok: false,
        reason: `Il manque ${missing} tour${missing > 1 ? "s" : ""} (objectif ${target}, planifié ${planned}).`,
      };
    }
    return { ok: true, reason: null };
  }

  const debutMs = toRaceTimestampMs(
    raceSettings.date,
    raceSettings.startTime,
  );
  const finCourseMs = debutMs + raceDurationSeconds(raceSettings) * 1000;
  const last = strategy.relais[strategy.relais.length - 1]!;
  const finStrategieMs = clockToAbsoluteMs(
    raceSettings.date,
    last.heureFin,
    debutMs,
  );

  if (finStrategieMs < finCourseMs) {
    const manquantSec = Math.ceil((finCourseMs - finStrategieMs) / 1000);
    const m = Math.floor(manquantSec / 60);
    const s = manquantSec % 60;
    return {
      ok: false,
      reason: `La stratégie se termine trop tôt — il manque ${m} min ${String(s).padStart(2, "0")} s pour dépasser l’heure de fin.`,
    };
  }

  return { ok: true, reason: null };
}

export function canValidateStrategyForLive(
  raceSettings: RaceSettings,
  strategy: Strategy | null | undefined,
): boolean {
  return getStrategyLiveReadiness(raceSettings, strategy).ok;
}
