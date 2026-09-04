import type {
  StrategyDriverConfig,
  StrategyLive,
  StrategyPlan,
  StrategySessionInfo,
  StrategyStintRow,
} from "../types/strategy";

const DRIVER_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#ef4444", "#f59e0b", "#06b6d4"];

export function parseDurationToSec(hms: string): number {
  const parts = hms.trim().split(":").map((p) => Number.parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

export function formatHms(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClockFromSec(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function createDriver(index: number, name = ""): StrategyDriverConfig {
  return {
    id: `d${index + 1}`,
    name: name || `Pilote ${index + 1}`,
    color: DRIVER_COLORS[index % DRIVER_COLORS.length],
    lapsPerStint: 21,
  };
}

export function defaultSessionInfo(): StrategySessionInfo {
  return {
    date: new Date().toLocaleDateString("fr-FR"),
    startTime: "15:00",
    duration: "24:00:00",
    car: "—",
    track: "—",
    pitTime: "0:01:33",
  };
}

export function createDefaultPlan(driverCount = 4): StrategyPlan {
  const drivers = Array.from({ length: driverCount }, (_, i) => createDriver(i));
  return {
    drivers,
    session: defaultSessionInfo(),
    stints: [],
    remarks: "",
  };
}

export function generateStintRows(
  plan: Pick<StrategyPlan, "drivers" | "session">,
  avgLapSec: number,
): StrategyStintRow[] {
  const { drivers, session } = plan;
  if (drivers.length === 0) return [];

  const raceSec = parseDurationToSec(session.duration);
  const pitSec = parseDurationToSec(session.pitTime);
  const startParts = session.startTime.split(":").map((p) => Number.parseInt(p, 10) || 0);
  const startSec =
    (startParts[0] ?? 15) * 3600 + (startParts[1] ?? 0) * 60 + (startParts[2] ?? 0);
  const lapSec = avgLapSec > 0 ? avgLapSec : 124;

  const rows: StrategyStintRow[] = [];
  let elapsed = 0;
  let driverIdx = 0;
  let stintNum = 1;

  while (elapsed < raceSec && stintNum < 200) {
    const driver = drivers[driverIdx % drivers.length];
    const plannedLaps = Math.max(1, driver.lapsPerStint);
    const stintDurSec = plannedLaps * lapSec + pitSec;
    const sessionAtStart = raceSec - elapsed;
    const sessionAfter = Math.max(0, sessionAtStart - stintDurSec);

    rows.push({
      stintNumber: stintNum,
      startTime: formatClockFromSec(startSec + elapsed),
      sessionTimeAtStart: formatHms(sessionAtStart),
      stintDuration: formatHms(stintDurSec),
      plannedLaps,
      sessionTimeAfter: formatHms(sessionAfter),
      driverId: driver.id,
      weatherChange: false,
      tireChange: true,
      lapsCompleted: null,
      repairTime: "0:00:00",
      isActive: false,
      isDone: false,
    });

    elapsed += stintDurSec;
    driverIdx += 1;
    stintNum += 1;
  }

  return rows;
}

export function applyLiveToPlan(
  plan: StrategyPlan,
  live: StrategyLive,
): StrategyPlan {
  const stints = plan.stints.map((row, i) => {
    const isActive = i === live.activeStintIndex;
    const isDone = i < live.activeStintIndex;

    return {
      ...row,
      isActive,
      isDone,
      lapsCompleted: isDone
        ? row.plannedLaps
        : isActive
          ? live.currentStintLaps
          : null,
      sessionTimeAtStart: isActive
        ? live.sessionTimeRemaining
        : row.sessionTimeAtStart,
      weatherChange: isActive ? live.weatherChange : row.weatherChange,
      repairTime:
        isActive && live.repairTimeSec > 0
          ? formatHms(live.repairTimeSec)
          : row.repairTime,
    };
  });

  return { ...plan, stints };
}

export function updatePlanDrivers(
  plan: StrategyPlan,
  drivers: StrategyDriverConfig[],
  avgLapSec: number,
): StrategyPlan {
  return {
    ...plan,
    drivers,
    stints: generateStintRows({ drivers, session: plan.session }, avgLapSec),
  };
}

export function updateStintDriver(
  plan: StrategyPlan,
  stintIndex: number,
  driverId: string,
): StrategyPlan {
  return {
    ...plan,
    stints: plan.stints.map((row, i) =>
      i === stintIndex ? { ...row, driverId } : row,
    ),
  };
}

export function driverById(
  plan: StrategyPlan,
  driverId: string,
): StrategyDriverConfig | undefined {
  return plan.drivers.find((d) => d.id === driverId);
}
