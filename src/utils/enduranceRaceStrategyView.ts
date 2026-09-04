import type { EndurancePlan } from "../endurance/models";
import type { StrategyLive } from "../types/strategy";
import { formatHms } from "../utils/strategyPlan";
import type { RaceStrategyView } from "../utils/raceStrategyView";
import { formatPitWindow } from "../utils/raceStrategyView";

function driverName(plan: EndurancePlan, piloteId: string): string {
  return plan.drivers.find((d) => d.id === piloteId)?.nom ?? "—";
}

/** Tour de pit prévu = cumul des tours jusqu'à la fin du relais actif. */
export function plannedPitLapFromEndurance(
  plan: EndurancePlan,
  activeStintIndex: number,
): number {
  const relais = plan.strategy?.relais ?? [];
  let total = 0;
  for (let i = 0; i <= activeStintIndex && i < relais.length; i++) {
    total += relais[i]?.toursPrevus ?? 0;
  }
  return Math.max(1, total);
}

/** Vue barre stratégie course à partir du plan préparation endurance. */
export function buildEnduranceRaceStrategyView(
  plan: EndurancePlan | null,
  live: StrategyLive,
): RaceStrategyView {
  const relais = plan?.strategy?.relais ?? [];
  const totalStints = relais.length;

  if (!plan?.strategy || totalStints === 0) {
    return {
      stintLabel: "— / —",
      lapsLabel: `${live.currentStintLaps} / —`,
      timeOnTrack: formatHms(
        live.stintTimeSec > 0
          ? live.stintTimeSec
          : Math.max(0, live.currentStintLaps * live.avgLapSec),
      ),
      nextDriver: "—",
      pitWindow: "Préparez la stratégie",
    };
  }

  const idx = Math.min(
    Math.max(0, live.activeStintIndex),
    Math.max(0, totalStints - 1),
  );
  const active = relais[idx];
  const stintNum = active?.numero ?? idx + 1;
  const plannedLaps = active?.toursPrevus ?? 0;
  const stintLaps = live.currentStintLaps;

  const timeOnTrackSec =
    live.stintTimeSec > 0
      ? live.stintTimeSec
      : Math.max(0, stintLaps * live.avgLapSec);

  const nextRow = relais[idx + 1];
  const nextDriver = nextRow
    ? driverName(plan, nextRow.piloteId)
    : "—";

  const pitLap = plannedPitLapFromEndurance(plan, idx);

  return {
    stintLabel: `${stintNum} / ${totalStints}`,
    lapsLabel:
      plannedLaps > 0 ? `${stintLaps} / ${plannedLaps}` : `${stintLaps} / —`,
    timeOnTrack: formatHms(timeOnTrackSec),
    nextDriver,
    pitWindow: formatPitWindow(pitLap),
  };
}
