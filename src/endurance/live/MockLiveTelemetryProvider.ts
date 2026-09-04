import type { EndurancePlan } from "../models";
import type { LiveTelemetryPatch, LiveTelemetryProvider } from "./LiveTelemetryProvider";
import type { LiveRaceSnapshot } from "./models";
import {
  DEFAULT_LIVE_FUEL,
  DEFAULT_LIVE_RACE_SNAPSHOT,
  DEFAULT_LIVE_SESSION,
  DEFAULT_LIVE_STINT,
} from "./models";

const TICK_MS = 1000;

/**
 * Fournisseur de démonstration — simule une course sans SDK iRacing.
 * Permet de tester le recalcul (réparation, SC, météo) depuis l'UI Live.
 */
export class MockLiveTelemetryProvider implements LiveTelemetryProvider {
  readonly id = "mock";
  readonly label = "Simulation (mock)";

  private snapshot: LiveRaceSnapshot = structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT);
  private timer: ReturnType<typeof setInterval> | null = null;
  private onUpdate: ((patch: LiveTelemetryPatch) => void) | null = null;
  private plan: EndurancePlan | null = null;
  private sessionTick = 0;

  bindPlan(plan: EndurancePlan | null): void {
    this.plan = plan;
    this.resetFromPlan();
  }

  start(onUpdate: (patch: LiveTelemetryPatch) => void): void {
    this.onUpdate = onUpdate;
    this.stop();
    this.resetFromPlan();
    this.snapshot.session = {
      ...this.snapshot.session,
      connected: true,
      iracingRunning: true,
      source: "mock",
      sessionType: "Race",
      isRace: true,
      flag: "green",
      error: null,
      updatedAt: new Date().toISOString(),
    };
    this.emit({ session: this.snapshot.session });

    this.timer = setInterval(() => {
      this.sessionTick += 1;
      const stint = this.snapshot.stint;
      if (stint.toursRestants > 0 && this.sessionTick % 3 === 0) {
        const toursCompletes = stint.toursCompletes + 1;
        const toursRestants = Math.max(0, stint.toursPrevus - toursCompletes);
        const chrono =
          this.plan?.drivers.find((d) => d.id === stint.piloteId)?.chronoSecondes ?? 90;
        this.emit({
          stint: {
            toursCompletes,
            toursRestants,
            dureeEcouleeSec: toursCompletes * chrono,
          },
          session: {
            sessionTimeSec: this.snapshot.session.sessionTimeSec + 3,
            sessionLaps: this.snapshot.session.sessionLaps + (toursRestants === 0 ? 1 : 0),
          },
        });
      } else {
        this.emit({
          session: {
            sessionTimeSec: this.snapshot.session.sessionTimeSec + 1,
          },
        });
      }
    }, TICK_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onUpdate = null;
    this.snapshot.session.connected = false;
    this.snapshot.session.source = "none";
  }

  getSnapshot(): LiveRaceSnapshot {
    return structuredClone(this.snapshot);
  }

  simulateRepair(): void {
    this.emit({ session: { flag: "yellow" } });
  }

  simulateSafetyCar(): void {
    this.emit({ session: { flag: "safety_car" } });
  }

  simulateWeatherChange(
    weather: import("./models").LiveWeatherState,
  ): void {
    this.emit({
      session: {
        weather,
        rainIntensityPercent:
          weather === "humide" ? 85 : weather === "mixte" ? 45 : 0,
        flag: "green",
      },
    });
  }

  private resetFromPlan(): void {
    const strategy = this.plan?.strategy;
    const first = strategy?.relais[0];
    const capacite = this.plan?.raceSettings.capaciteReservoirLitres ?? 100;
    const pilote = this.plan?.drivers.find((d) => d.id === first?.piloteId);

    this.snapshot = {
      session: {
        ...DEFAULT_LIVE_SESSION,
        trackName: this.plan?.raceSettings.circuit ?? null,
        carName: this.plan?.raceSettings.voiture ?? null,
      },
      stint: {
        ...DEFAULT_LIVE_STINT,
        numeroRelais: first?.numero ?? 1,
        piloteId: first?.piloteId ?? null,
        piloteNom: pilote?.nom ?? null,
        toursPrevus: first?.toursPrevus ?? 0,
        toursRestants: first?.toursPrevus ?? 0,
        dureePrevueSec: first?.dureeSecondes ?? 0,
        changementPneusPrevu: first?.changementPneus ?? false,
      },
      fuel: {
        ...DEFAULT_LIVE_FUEL,
        capaciteLitres: capacite,
        niveauLitres: capacite,
        pourcentage: 100,
        consommationLitresParTour: pilote?.consommationLitresParTour ?? 0,
        toursRestantsEstimes: first?.toursMaxCarburant ?? 0,
        estime: pilote?.consommationEstimee ?? true,
      },
      strategy: structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT.strategy),
    };
    this.sessionTick = 0;
  }

  private emit(patch: LiveTelemetryPatch): void {
    if (patch.session) {
      this.snapshot.session = {
        ...this.snapshot.session,
        ...patch.session,
        updatedAt: new Date().toISOString(),
      };
    }
    if (patch.stint) {
      this.snapshot.stint = { ...this.snapshot.stint, ...patch.stint };
    }
    if (patch.fuel) {
      this.snapshot.fuel = { ...this.snapshot.fuel, ...patch.fuel };
    }
    this.onUpdate?.(patch);
  }
}
