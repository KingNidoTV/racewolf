function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Mesure la durée réelle des arrêts aux stands (SessionTime iRacing). */
export class PitDurationTracker {
  private inPit = false;
  private enteredSessionTime = -1;
  private samples: number[] = [];
  private estimateSec = 93;

  /** Nombre d'arrêts aux stands déjà mesurés cette session. */
  get measuredStopCount(): number {
    return this.samples.length;
  }

  /** Vrai tant qu'on n'a pas au moins 2 arrêts mesurés (valeur par défaut 93 s). */
  get pitTimeIsEstimated(): boolean {
    return this.samples.length < 2;
  }

  tick(telemetry: Record<string, unknown>): number {
    const sessionTime = num(telemetry.SessionTime, -1);
    const playerIdx = num(telemetry.PlayerCarIdx, 0);
    const onPitRoadArr = telemetry.CarIdxOnPitRoad as boolean[] | undefined;
    const onPitRoad = Array.isArray(onPitRoadArr)
      ? Boolean(onPitRoadArr[playerIdx])
      : Boolean(telemetry.OnPitRoad);
    const pitActive = Boolean(telemetry.PitstopActive);
    const inStall = num(telemetry.PlayerCarInPitStall, 0) > 0;
    const onPit = onPitRoad || pitActive || inStall;

    if (onPit && !this.inPit && sessionTime >= 0) {
      this.inPit = true;
      this.enteredSessionTime = sessionTime;
    } else if (!onPit && this.inPit) {
      this.inPit = false;
      if (this.enteredSessionTime >= 0 && sessionTime > this.enteredSessionTime) {
        const dur = sessionTime - this.enteredSessionTime;
        if (dur >= 25 && dur <= 240) {
          this.samples.push(dur);
          if (this.samples.length > 6) this.samples.shift();
          const avg =
            this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
          this.estimateSec = Math.round(avg);
        }
      }
      this.enteredSessionTime = -1;
    }

    return this.estimateSec;
  }

  reset(): void {
    this.inPit = false;
    this.enteredSessionTime = -1;
    this.samples = [];
    this.estimateSec = 93;
  }
}
