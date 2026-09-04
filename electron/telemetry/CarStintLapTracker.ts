function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type CarState = {
  wasOnPit: boolean;
  /** CarIdxLap à la dernière sortie des stands (ou départ de course). */
  pitExitLap: number;
  initialized: boolean;
};

/**
 * Tours depuis la sortie des stands par voiture.
 * iRacing n’expose pas CarIdxStintLaps — on déduit via CarIdxLap + CarIdxOnPitRoad.
 */
export class CarStintLapTracker {
  private sessionUniqueId = -1;
  private cars = new Map<number, CarState>();

  reset(): void {
    this.sessionUniqueId = -1;
    this.cars.clear();
  }

  tick(telemetry: Record<string, unknown>): Map<number, number> {
    const uid = num(telemetry.SessionUniqueID, -1);
    if (uid >= 0 && uid !== this.sessionUniqueId) {
      this.sessionUniqueId = uid;
      this.cars.clear();
    }

    const laps = telemetry.CarIdxLap as number[] | undefined;
    const onPit = telemetry.CarIdxOnPitRoad as boolean[] | undefined;
    const lapDist = telemetry.CarIdxLapDistPct as number[] | undefined;
    const positions = telemetry.CarIdxPosition as number[] | undefined;
    const out = new Map<number, number>();

    if (!Array.isArray(laps)) return out;

    for (let idx = 0; idx < laps.length; idx++) {
      const lap = num(laps[idx], 0);
      const pit = Boolean(onPit?.[idx]);
      const pct = num(lapDist?.[idx], -1);
      const pos = num(positions?.[idx], 0);

      let state = this.cars.get(idx);
      if (!state) {
        state = {
          wasOnPit: pit,
          pitExitLap: lap > 0 ? lap : 1,
          initialized: false,
        };
        this.cars.set(idx, state);
      }

      if (pct < 0 || pos < 1) {
        out.set(idx, 0);
        state.wasOnPit = pit;
        continue;
      }

      if (!state.initialized && !pit && lap > 0) {
        state.pitExitLap = 1;
        state.initialized = true;
      }

      if (state.wasOnPit && !pit && lap > 0) {
        state.pitExitLap = lap;
        state.initialized = true;
      }
      state.wasOnPit = pit;

      if (pit) {
        out.set(idx, 0);
        continue;
      }

      out.set(idx, Math.max(0, lap - state.pitExitLap));
    }

    return out;
  }
}
