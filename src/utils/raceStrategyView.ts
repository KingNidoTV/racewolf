import type { StrategyLive, StrategyPlan } from "../types/strategy";
import { driverById, formatHms } from "./strategyPlan";

export interface RaceStrategyView {
  stintLabel: string;
  lapsLabel: string;
  timeOnTrack: string;
  nextDriver: string;
  pitWindow: string;
}

/** Tour de pit prévu = fin du relais en cours (cumul des tours prévus). */
export function plannedPitLap(plan: StrategyPlan, activeStintIndex: number): number {
  let total = 0;
  for (let i = 0; i <= activeStintIndex && i < plan.stints.length; i++) {
    total += plan.stints[i]?.plannedLaps ?? 0;
  }
  return Math.max(1, total);
}

export function formatPitWindow(pitLap: number): string {
  const lap = Math.max(1, pitLap);
  const start = Math.max(1, lap - 3);
  const end = lap + 3;
  return `T${start} – T${end}`;
}

export function buildRaceStrategyView(
  plan: StrategyPlan,
  live: StrategyLive,
): RaceStrategyView {
  const totalStints = plan.stints.length;
  const idx = Math.min(
    Math.max(0, live.activeStintIndex),
    Math.max(0, totalStints - 1),
  );
  const active = plan.stints[idx];
  const stintNum = idx + 1;
  const plannedLaps = active?.plannedLaps ?? 0;
  const stintLaps = live.currentStintLaps;

  const timeOnTrackSec =
    live.stintTimeSec > 0
      ? live.stintTimeSec
      : Math.max(0, stintLaps * live.avgLapSec);

  const nextRow = plan.stints[idx + 1];
  const nextDriver = nextRow
    ? (driverById(plan, nextRow.driverId)?.name ?? "—")
    : "—";

  const pitLap = plannedPitLap(plan, idx);

  return {
    stintLabel:
      totalStints > 0 ? `${stintNum} / ${totalStints}` : `${stintNum} / —`,
    lapsLabel:
      plannedLaps > 0
        ? `${stintLaps} / ${plannedLaps}`
        : `${stintLaps} / —`,
    timeOnTrack: formatHms(timeOnTrackSec),
    nextDriver,
    pitWindow: formatPitWindow(pitLap),
  };
}
