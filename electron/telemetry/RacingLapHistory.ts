import { formatLapTime } from "../irsdk/format";
import { readPlayerRaceContext } from "../irsdk/playerRaceContext";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface RacingLapRecord {
  lapNumber: number;
  lapTime: string;
  lapTimeSec: number;
  deltaToPrevious: string;
}

function deltaStr(current: number, previous: number): string {
  if (previous <= 0) return "—";
  const d = current - previous;
  if (Math.abs(d) < 0.001) return "±0.000";
  return d > 0 ? `+${d.toFixed(3)}` : d.toFixed(3);
}

/** Historique des tours récents (plafond configurable, défaut 15). */
export class RacingLapHistory {
  private lastCompletedLap = -1;
  private records: RacingLapRecord[] = [];
  private maxRecords = 15;

  setMaxRecords(max: number): void {
    this.maxRecords = Math.min(15, Math.max(1, Math.round(max)));
    if (this.records.length > this.maxRecords) {
      this.records.length = this.maxRecords;
    }
  }

  tick(telemetry: Record<string, unknown>): RacingLapRecord[] {
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
      const prev = this.records[0]?.lapTimeSec ?? -1;
      this.unshiftRecord(completed, lastTime, deltaStr(lastTime, prev));
    }

    if (this.lastCompletedLap < 0 && lap > 0) {
      this.lastCompletedLap = completed;
    } else if (completed > this.lastCompletedLap) {
      this.lastCompletedLap = completed;
    }

    if (lapValid) {
      this.syncLatestFromSdk(completed, lastTime);
    }

    return this.records;
  }

  private syncLatestFromSdk(completed: number, lastTime: number): void {
    if (completed < 1 || lastTime <= 0) return;

    const head = this.records[0];
    if (
      head &&
      head.lapNumber === completed &&
      Math.abs(head.lapTimeSec - lastTime) < 0.001
    ) {
      return;
    }

    const prev =
      head && head.lapNumber === completed
        ? (this.records[1]?.lapTimeSec ?? -1)
        : (head?.lapTimeSec ?? -1);

    if (head?.lapNumber === completed) {
      this.records[0] = {
        lapNumber: completed,
        lapTime: formatLapTime(lastTime),
        lapTimeSec: lastTime,
        deltaToPrevious: deltaStr(lastTime, prev),
      };
      return;
    }

    this.unshiftRecord(completed, lastTime, deltaStr(lastTime, prev));
  }

  private unshiftRecord(
    lapNumber: number,
    lapTimeSec: number,
    deltaToPrevious: string,
  ): void {
    this.records.unshift({
      lapNumber,
      lapTime: formatLapTime(lapTimeSec),
      lapTimeSec,
      deltaToPrevious,
    });
    if (this.records.length > this.maxRecords) {
      this.records.length = this.maxRecords;
    }
  }

  reset(): void {
    this.lastCompletedLap = -1;
    this.records = [];
  }
}
