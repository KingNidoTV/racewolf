import type { SessionData } from "@irsdk-node/types";
import type { StrategyLive, StrategySessionInfo } from "../../src/types/strategy";
function formatHms(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

type Telemetry = Record<string, unknown>;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function buildStrategySession(
  telemetry: Telemetry,
  session: SessionData,
  pitDurationSec = 93,
  pitTimeEstimated = true,
): StrategySessionInfo {
  const weekend = session.WeekendInfo;
  const timeTotal = num(telemetry.SessionTimeTotal, -1);
  const track = weekend?.TrackDisplayName ?? weekend?.TrackName ?? "—";
  const car = weekend?.Category ?? weekend?.EventType ?? "—";

  const pitSec =
    pitDurationSec > 0 ? pitDurationSec : 93;

  return {
    date: new Date().toLocaleDateString("fr-FR"),
    startTime: "15:00",
    duration: timeTotal > 0 ? formatHms(timeTotal) : "24:00:00",
    car: String(car),
    track: String(track),
    pitTime: formatHms(pitSec),
    pitTimeEstimated,
  };
}

export function buildStrategyLive(
  telemetry: Telemetry,
  activeStintIndex: number,
  stintLaps = 0,
  stintTimeSec = 0,
): StrategyLive {
  const currentStintLaps = Math.max(0, stintLaps);

  const timeRemain = num(telemetry.SessionTimeRemain, -1);
  const bestLap = num(telemetry.LapBestLapTime, -1);
  const lastLap = num(telemetry.LapLastLapTime, -1);
  const avgLapSec = bestLap > 0 ? bestLap : lastLap > 0 ? lastLap : 124;

  const repair = num(telemetry.PlayerCarInPitStall, 0) > 0 ? num(telemetry.PitRepairLeft, 0) : 0;
  const skies = num(telemetry.Skies, 0);
  const wetness = num(telemetry.TrackWetness, 0);

  return {
    activeStintIndex: Math.max(0, activeStintIndex),
    currentStintLaps,
    stintTimeSec: Math.max(0, stintTimeSec),
    sessionTimeRemaining: timeRemain >= 0 ? formatHms(timeRemain) : "—",
    avgLapSec,
    repairTimeSec: repair > 0 ? repair : 0,
    weatherChange: skies >= 2 || wetness >= 1,
  };
}
