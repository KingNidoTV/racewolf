import { formatLapTime } from "../irsdk/format";
import { readPlayerRaceContext } from "../irsdk/playerRaceContext";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface StintLapRecord {
  lapNumber: number;
  lapTime: string;
  lapTimeSec: number;
}

export class StintLapHistory {
  private lastCompletedLap = -1;
  private records: StintLapRecord[] = [];

  tick(telemetry: Record<string, unknown>): StintLapRecord[] {
    const ctx = readPlayerRaceContext(telemetry);
    const lap = num(telemetry.Lap, 0);
    const lastTime = num(telemetry.LapLastLapTime, -1);
    const completed = lap - 1;
    const lapValid = !ctx.onPit && !ctx.towing && !ctx.inGarage;

    if (
      lapValid &&
      completed > this.lastCompletedLap &&
      lastTime > 0 &&
      this.lastCompletedLap >= 0
    ) {
      this.records.unshift({
        lapNumber: completed,
        lapTime: formatLapTime(lastTime),
        lapTimeSec: lastTime,
      });
      if (this.records.length > 10) this.records.length = 10;
    }
    if (this.lastCompletedLap < 0 && lap > 0) {
      this.lastCompletedLap = completed;
    } else if (completed > this.lastCompletedLap) {
      this.lastCompletedLap = completed;
    }

    return this.records;
  }

  reset(): void {
    this.lastCompletedLap = -1;
    this.records = [];
  }
}
