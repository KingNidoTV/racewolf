function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Conso carburant type black box iRacing : moyenne L/tour sur les tours
 * complétés (pas FuelUsePerHour instantané).
 */
export class FuelTelemetryTracker {
  private maxFuelLevel = 0;
  private fuelAtLapStart = 0;
  private lastLapCompleted = -1;
  private initialized = false;
  /** Consos mesurées tour par tour (derniers tours). */
  private lapLitres: number[] = [];
  private static readonly MAX_LAPS = 5;

  get tankCapacityLitres(): number {
    return Math.round(this.maxFuelLevel * 10) / 10;
  }

  /** Moyenne L/tour sur les tours complets (0 si pas encore de mesure). */
  get avgLitresPerLap(): number {
    if (this.lapLitres.length === 0) return 0;
    const sum = this.lapLitres.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.lapLitres.length) * 100) / 100;
  }

  /**
   * Compat : L/h uniquement via litresPerHourFromLap(chrono).
   * @deprecated Prefer avgLitresPerLap + litresPerHourFromLap.
   */
  get consumptionLitresParHeure(): number {
    return 0;
  }

  get consumptionIsEstimated(): boolean {
    return this.lapLitres.length < 2;
  }

  /** Tours restants entiers (stable en course). */
  estimatedLapsRemaining(fuelLevel: number, lapTimeSec = 0): number | null {
    let lpt = this.avgLitresPerLap;
    if (lpt <= 0 && lapTimeSec > 0) {
      // Avant le 1er tour complet : pas d’affichage (évite le bruit).
      return null;
    }
    if (lpt <= 0 || fuelLevel <= 0) return null;
    return Math.max(0, Math.floor(fuelLevel / lpt));
  }

  /** L/h à partir de L/tour × chrono de référence. */
  litresPerHourFromLap(lapTimeSec: number): number {
    const lpt = this.avgLitresPerLap;
    if (lpt <= 0 || lapTimeSec <= 0) return 0;
    return Math.round((lpt / lapTimeSec) * 3600 * 10) / 10;
  }

  tick(telemetry: Record<string, unknown>): void {
    const fuelLevel = num(telemetry.FuelLevel, 0);
    if (fuelLevel > this.maxFuelLevel) {
      this.maxFuelLevel = fuelLevel;
    }

    const lapCompleted = Math.max(
      0,
      Math.floor(num(telemetry.LapCompleted, num(telemetry.Lap, 0))),
    );

    if (!this.initialized) {
      this.initialized = true;
      this.fuelAtLapStart = fuelLevel;
      this.lastLapCompleted = lapCompleted;
      return;
    }

    // Plein / ajout carburant : repartir sur une base propre.
    if (fuelLevel > this.fuelAtLapStart + 1.5) {
      this.fuelAtLapStart = fuelLevel;
      this.lastLapCompleted = lapCompleted;
      return;
    }

    if (lapCompleted > this.lastLapCompleted) {
      const used = this.fuelAtLapStart - fuelLevel;
      // Ignore outlières (tour invalide, reset, etc.).
      if (used >= 0.15 && used < Math.max(8, this.maxFuelLevel * 0.85)) {
        this.lapLitres.push(used);
        if (this.lapLitres.length > FuelTelemetryTracker.MAX_LAPS) {
          this.lapLitres.shift();
        }
      }
      this.fuelAtLapStart = fuelLevel;
      this.lastLapCompleted = lapCompleted;
    }
  }

  reset(): void {
    this.maxFuelLevel = 0;
    this.fuelAtLapStart = 0;
    this.lastLapCompleted = -1;
    this.initialized = false;
    this.lapLitres = [];
  }
}
