import { IRacingSDK } from "irsdk-node";
import { sdkIsMocked } from "@irsdk-node/native";
import type { SessionData } from "@irsdk-node/types";
import type { EnduranceLiveSession } from "../../src/endurance/models/LiveSession";
import { DEFAULT_LIVE_SESSION } from "../../src/endurance/models/LiveSession";
import { flattenTelemetry } from "../irsdk/flattenTelemetry";
import { PitDurationTracker } from "../telemetry/PitDurationTracker";
import { FuelTelemetryTracker } from "./FuelTelemetryTracker";
import { LiveRaceMapper } from "./mapLiveRaceSnapshot";
import type { LiveRaceSnapshot } from "../../src/endurance/live/models";
import { DEFAULT_LIVE_RACE_SNAPSHOT } from "../../src/endurance/live/models";

const POLL_MS = 250;
const WAIT_DATA_MS = 50;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sessionTypeLabel(session: SessionData, sessionNum: number): string {
  const sessions = session.SessionInfo?.Sessions ?? [];
  const current = sessions.find((s) => s.SessionNum === sessionNum);
  return current?.SessionType ?? current?.SessionName ?? "—";
}

function isPracticeSession(sessionType: string): boolean {
  const s = sessionType.toLowerCase();
  if (/\brace\b/.test(s)) return false;
  return (
    s.includes("practice") ||
    s.includes("pratique") ||
    s.includes("essai") ||
    s.includes("test") ||
    s.includes("time trial")
  );
}

function readSessionNames(session: SessionData): {
  trackName: string | null;
  carName: string | null;
} {
  const weekend = session.WeekendInfo;
  const trackName =
    weekend?.TrackDisplayName ?? weekend?.TrackName ?? null;
  const driver = session.DriverInfo?.Drivers?.find(
    (d) => d.CarIdx === session.DriverInfo?.DriverCarIdx,
  );
  const carName =
    driver?.CarScreenName ??
    driver?.CarPath?.split("/").pop()?.replace(/_/g, " ") ??
    weekend?.Category ??
    null;
  return {
    trackName: trackName ? String(trackName) : null,
    carName: carName ? String(carName) : null,
  };
}

/** Lecture légère du SDK iRacing pour pit / circuit / voiture (mode endurance). */
export class EnduranceTelemetryBridge {
  private sdk: IRacingSDK | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private tickBusy = false;
  private pitDurationTracker = new PitDurationTracker();
  private fuelTelemetryTracker = new FuelTelemetryTracker();
  private liveRaceMapper = new LiveRaceMapper();
  private snapshot: EnduranceLiveSession = { ...DEFAULT_LIVE_SESSION };
  private liveRaceSnapshot: LiveRaceSnapshot = structuredClone(
    DEFAULT_LIVE_RACE_SNAPSHOT,
  );
  private onLiveRaceUpdate: ((payload: LiveRaceSnapshot) => void) | null = null;

  getSnapshot(): EnduranceLiveSession {
    return this.snapshot;
  }

  getLiveRaceSnapshot(): LiveRaceSnapshot {
    return this.liveRaceSnapshot;
  }

  async start(
    onUpdate: (payload: EnduranceLiveSession) => void,
    onLiveRace?: (payload: LiveRaceSnapshot) => void,
  ): Promise<void> {
    this.stop();
    this.onLiveRaceUpdate = onLiveRace ?? null;
    this.running = true;
    this.snapshot = { ...DEFAULT_LIVE_SESSION };
    this.liveRaceSnapshot = structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT);
    this.liveRaceMapper.reset();

    if (sdkIsMocked) {
      this.snapshot = {
        ...DEFAULT_LIVE_SESSION,
        error:
          "SDK iRacing indisponible — installez Electron via npm run install:electron",
      };
      onUpdate(this.snapshot);
      this.emitDisconnectedLiveRace(this.snapshot.error ?? undefined);
      return;
    }

    try {
      const simRunning = await IRacingSDK.IsSimRunning();
      if (!simRunning) {
        this.snapshot = {
          ...DEFAULT_LIVE_SESSION,
          iracingRunning: false,
          error: "iRacing non détecté — lancez une session.",
        };
        onUpdate(this.snapshot);
        this.emitDisconnectedLiveRace(this.snapshot.error ?? undefined);
      } else {
        this.emitDisconnectedLiveRace("Connexion à iRacing…");
      }

      this.sdk = new IRacingSDK({ autoEnableTelemetry: false });
      this.sdk.startSDK();

      const tick = () => {
        if (!this.running || !this.sdk || this.tickBusy) return;
        this.tickBusy = true;
        void this.runTick(onUpdate)
          .catch((err) => {
            this.snapshot = {
              ...this.snapshot,
              connected: false,
              error:
                err instanceof Error ? err.message : "Erreur lecture SDK",
            };
            onUpdate(this.snapshot);
          })
          .finally(() => {
            this.tickBusy = false;
          });
      };

      tick();
      this.pollTimer = setInterval(tick, POLL_MS);
    } catch (err) {
      this.snapshot = {
        ...DEFAULT_LIVE_SESSION,
        error:
          err instanceof Error
            ? err.message
            : "Impossible de charger le SDK iRacing",
      };
      onUpdate(this.snapshot);
    }
  }

  private async runTick(
    onUpdate: (payload: EnduranceLiveSession) => void,
  ): Promise<void> {
    const sdk = this.sdk;
    if (!sdk) return;

    const simRunning = await IRacingSDK.IsSimRunning();
    if (!this.running) return;

    if (!simRunning) {
      this.snapshot = {
        ...DEFAULT_LIVE_SESSION,
        iracingRunning: false,
        error: "iRacing non détecté",
      };
      onUpdate(this.snapshot);
      this.emitDisconnectedLiveRace();
      return;
    }

    if (!sdk.waitForData(WAIT_DATA_MS)) {
      sdk.enableTelemetry(true);
      return;
    }

    const rawTelemetry = sdk.getTelemetry();
    const session = sdk.getSessionData();
    if (!session || !rawTelemetry || Object.keys(rawTelemetry).length === 0) {
      this.snapshot = {
        ...this.snapshot,
        iracingRunning: true,
        connected: false,
        error: "Session iRacing en chargement…",
      };
      onUpdate(this.snapshot);
      this.emitDisconnectedLiveRace("Session iRacing en chargement…");
      return;
    }

    const telemetry = flattenTelemetry(rawTelemetry);
    const pitDurationSec = this.pitDurationTracker.tick(telemetry);
    const pitTimeEstimated = this.pitDurationTracker.pitTimeIsEstimated;
    this.fuelTelemetryTracker.tick(telemetry);
    const sessionType = sessionTypeLabel(
      session,
      num(telemetry.SessionNum, 0),
    );
    const isPractice = isPracticeSession(sessionType);
    const { trackName, carName } = readSessionNames(session);
    const refLapSec =
      num(telemetry.LapLastLapTime, 0) || num(telemetry.LapBestLapTime, 0);
    const consoLph =
      this.fuelTelemetryTracker.litresPerHourFromLap(refLapSec) ||
      this.fuelTelemetryTracker.consumptionLitresParHeure;

    this.snapshot = {
      connected: true,
      iracingRunning: true,
      sessionType,
      isPractice,
      trackName,
      carName,
      pitDurationSec,
      pitTimeEstimated,
      measuredPitStops: this.pitDurationTracker.measuredStopCount,
      capaciteReservoirLitres: this.fuelTelemetryTracker.tankCapacityLitres,
      consommationLitresParHeure: consoLph,
      consommationEstimee: this.fuelTelemetryTracker.consumptionIsEstimated,
      error: null,
    };
    onUpdate(this.snapshot);

    if (this.onLiveRaceUpdate) {
      this.liveRaceSnapshot = this.liveRaceMapper.map(telemetry, session);
      this.onLiveRaceUpdate(this.liveRaceSnapshot);
    }
  }

  private emitDisconnectedLiveRace(error = "iRacing non détecté"): void {
    if (!this.onLiveRaceUpdate) return;
    this.liveRaceSnapshot = {
      ...structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT),
      session: {
        ...DEFAULT_LIVE_RACE_SNAPSHOT.session,
        source: "sdk",
        connected: false,
        iracingRunning: false,
        error,
        updatedAt: new Date().toISOString(),
      },
    };
    this.onLiveRaceUpdate(this.liveRaceSnapshot);
  }

  stop(): void {
    this.running = false;
    this.pitDurationTracker.reset();
    this.fuelTelemetryTracker.reset();
    this.liveRaceMapper.reset();
    this.onLiveRaceUpdate = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.sdk) {
      try {
        this.sdk.stopSDK();
      } catch {
        /* ignore */
      }
      this.sdk = null;
    }
    this.snapshot = { ...DEFAULT_LIVE_SESSION };
    this.liveRaceSnapshot = structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT);
  }
}
