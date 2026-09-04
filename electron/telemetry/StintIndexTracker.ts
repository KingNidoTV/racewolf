function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export interface StintRuntime {
  index: number;
  stintLaps: number;
  stintTimeSec: number;
}

/** Relais + temps passé sur le relais en cours. */
export class StintIndexTracker {
  private lastStintLaps = -1;
  private stintIndex = 0;
  private stintStartSessionTime = -1;
  private stintStartLap = 0;

  tick(telemetry: Record<string, unknown>): StintRuntime {
    const sessionTime = num(telemetry.SessionTime, -1);
    const lap = num(telemetry.Lap, 0);

    if (this.stintStartSessionTime < 0 && sessionTime >= 0) {
      this.stintStartSessionTime = sessionTime;
      this.stintStartLap = lap > 0 ? lap : 1;
    }

    const stintLaps = Math.max(0, lap - this.stintStartLap);
    this.lastStintLaps = stintLaps;

    let stintTimeSec = 0;
    if (sessionTime >= 0 && this.stintStartSessionTime >= 0) {
      stintTimeSec = Math.max(0, sessionTime - this.stintStartSessionTime);
    }

    return {
      index: this.stintIndex,
      stintLaps,
      stintTimeSec,
    };
  }

  /** Sortie des stands : remet le décompte de tours du relais à zéro. */
  onPitExit(telemetry: Record<string, unknown>): void {
    const sessionTime = num(telemetry.SessionTime, -1);
    const lap = num(telemetry.Lap, 0);
    this.stintIndex += 1;
    this.stintStartSessionTime = sessionTime >= 0 ? sessionTime : 0;
    this.stintStartLap = lap > 0 ? lap : 1;
    this.lastStintLaps = 0;
  }

  reset(): void {
    this.lastStintLaps = -1;
    this.stintIndex = 0;
    this.stintStartSessionTime = -1;
    this.stintStartLap = 0;
  }
}
