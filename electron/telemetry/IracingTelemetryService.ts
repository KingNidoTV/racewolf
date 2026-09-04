import { IRacingSDK } from "irsdk-node";
import { sdkIsMocked } from "@irsdk-node/native";
import type { TelemetryEnvelope } from "../../src/types/ipc";
import type { OverlayPanelPrefs } from "../../src/types/overlayPrefs";
import { DEFAULT_OVERLAY_PREFS } from "../../src/types/overlayPrefs";
import { detectViewMode } from "../irsdk/detectViewMode";
import { flattenTelemetry } from "../irsdk/flattenTelemetry";
import { mapGarageTelemetry, mapRacingTelemetry } from "../irsdk/mapTelemetry";
import { readRawSessionYaml } from "../irsdk/sessionYaml";
import { OpponentSectorTracker } from "./OpponentSectorTracker";
import { LiveStandingsSectorTracker } from "./LiveStandingsSectorTracker";
import { PitDurationTracker } from "./PitDurationTracker";
import { PitRoadTracker } from "./PitRoadTracker";
import { PlayerSectorTracker } from "./PlayerSectorTracker";
import { RacingLapHistory } from "./RacingLapHistory";
import { CarStintLapTracker } from "./CarStintLapTracker";
import { StintIndexTracker } from "./StintIndexTracker";
import { StintLapHistory } from "./StintLapHistory";
import { FuelTelemetryTracker } from "../endurance/FuelTelemetryTracker";

/** ~30 Hz */
const POLL_MS = 34;
/** Attente frame — irsdk-node impose min 16 ms */
const WAIT_DATA_MS = 50;
const TELEM_MISS_BEFORE_HINT = 45;

export class IracingTelemetryService {
  private sdk: IRacingSDK | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private lastError: string | null = null;
  private telemMissTicks = 0;
  private tickBusy = false;
  private stintHistory = new StintLapHistory();
  private stintIndexTracker = new StintIndexTracker();
  private pitDurationTracker = new PitDurationTracker();
  private pitRoadTracker = new PitRoadTracker();
  private opponentSectorTracker = new OpponentSectorTracker();
  private liveStandingsSectorTracker = new LiveStandingsSectorTracker();
  private playerSectorTracker = new PlayerSectorTracker();

  private racingLapHistory = new RacingLapHistory();
  private carStintLapTracker = new CarStintLapTracker();
  private fuelTracker = new FuelTelemetryTracker();
  private panelPrefs: OverlayPanelPrefs = { ...DEFAULT_OVERLAY_PREFS };

  setPanelPrefs(prefs: OverlayPanelPrefs): void {
    this.panelPrefs = prefs;
    this.racingLapHistory.setMaxRecords(prefs.timingRecentLaps);
  }

  async isSimRunning(): Promise<boolean> {
    try {
      return await IRacingSDK.IsSimRunning();
    } catch {
      return false;
    }
  }

  getLastError(): string | null {
    return this.lastError;
  }

  async start(onUpdate: (payload: TelemetryEnvelope) => void): Promise<void> {
    this.stop();
    this.running = true;
    this.lastError = null;
    this.telemMissTicks = 0;

    if (sdkIsMocked) {
      this.lastError =
        "Module SDK iRacing absent (binaire Windows). Dans le dossier du projet : npm run install:electron";
      this.emitWaiting(onUpdate, false);
      return;
    }

    try {
      const simRunning = await IRacingSDK.IsSimRunning();
      if (!simRunning) {
        this.lastError = "iRacing n'est pas lancé.";
        this.emitWaiting(onUpdate, false);
        return;
      }

      this.sdk = new IRacingSDK({ autoEnableTelemetry: false });
      this.sdk.startSDK();

      const tick = () => {
        if (!this.running || !this.sdk || this.tickBusy) return;
        this.tickBusy = true;
        void this.runTick(onUpdate)
          .catch((err) => {
            this.lastError =
              err instanceof Error ? err.message : "Erreur lecture SDK";
            this.emitWaiting(onUpdate, true);
          })
          .finally(() => {
            this.tickBusy = false;
          });
      };

      tick();
      this.pollTimer = setInterval(tick, POLL_MS);
    } catch (err) {
      this.lastError =
        err instanceof Error
          ? err.message
          : "Impossible de charger le module iRacing SDK";
      this.emitWaiting(onUpdate, false);
    }
  }

  private async runTick(
    onUpdate: (payload: TelemetryEnvelope) => void,
  ): Promise<void> {
    const sdk = this.sdk;
    if (!sdk) return;

    const simRunning = await IRacingSDK.IsSimRunning();
    if (!this.running || !this.sdk) return;
    if (!simRunning) {
      this.lastError = "iRacing n'est plus détecté.";
      this.emitWaiting(onUpdate, false);
      return;
    }

    if (this.telemMissTicks > 0 && this.telemMissTicks % 20 === 0) {
      sdk.startSDK();
    }

    const hasData = sdk.waitForData(WAIT_DATA_MS);
    if (!hasData) {
      this.telemMissTicks += 1;
      if (this.telemMissTicks === 30) {
        sdk.enableTelemetry(true);
      }
      if (this.telemMissTicks >= TELEM_MISS_BEFORE_HINT) {
        this.lastError =
          "Pas de flux télémétrie. Vérifiez Options → UI → télémétrie iRacing. SimHub et ATH peuvent tourner ensemble.";
      } else {
        this.lastError = null;
      }
      this.emitWaiting(onUpdate, true);
      return;
    }

    const rawTelemetry = sdk.getTelemetry();
    const session = sdk.getSessionData();
    const sessionYaml = readRawSessionYaml(sdk);
    if (!session || !rawTelemetry || Object.keys(rawTelemetry).length === 0) {
      this.telemMissTicks += 1;
      this.lastError = "Session iRacing en chargement…";
      this.emitWaiting(onUpdate, true);
      return;
    }

    this.telemMissTicks = 0;
    this.lastError = null;

    const telemetry = flattenTelemetry(rawTelemetry);
    const viewMode = detectViewMode(telemetry, true, session);
    const pitRoad = this.pitRoadTracker.tick(telemetry);

    if (pitRoad.exitedPit) {
      this.racingLapHistory.reset();
      this.stintHistory.reset();
      this.playerSectorTracker.onPitExit();
      this.stintIndexTracker.onPitExit(telemetry);
      this.fuelTracker.reset();
    }

    const stintRecords = this.stintHistory.tick(telemetry);
    const stint = this.stintIndexTracker.tick(telemetry);
    const pitDurationSec = this.pitDurationTracker.tick(telemetry);
    const pitTimeEstimated = this.pitDurationTracker.pitTimeIsEstimated;
    const recentLaps = this.racingLapHistory.tick(telemetry);
    this.fuelTracker.tick(telemetry);
    const refLap =
      Number(telemetry.LapLastLapTime ?? 0) > 0
        ? Number(telemetry.LapLastLapTime)
        : Number(telemetry.LapBestLapTime ?? 0);
    const fuelLapsRemaining = this.fuelTracker.estimatedLapsRemaining(
      Number(telemetry.FuelLevel ?? 0),
      refLap,
    );

    this.opponentSectorTracker.tick(telemetry, session);
    const stintLapsByCar = this.carStintLapTracker.tick(telemetry);
    this.playerSectorTracker.tick(telemetry, session, stint.index);
    const liveSectors = this.playerSectorTracker.getLiveTiming(
      telemetry,
      session,
      this.opponentSectorTracker.sessionBestSectors(),
    );

    const opponentSectors = new Map<number, number[]>();
    for (const driver of session.DriverInfo?.Drivers ?? []) {
      const idx = driver.CarIdx;
      opponentSectors.set(idx, this.opponentSectorTracker.getBestSectors(idx));
    }

    const playerIdx = Number(telemetry.PlayerCarIdx ?? 0);
    this.liveStandingsSectorTracker.tick(telemetry, session, {
      playerIdx,
      stintIndex: stint.index,
      sessionBestFloor: this.opponentSectorTracker.sessionBestSectors(),
      opponentBests: opponentSectors,
    });
    const liveStandingsSectorStatuses =
      this.liveStandingsSectorTracker.getAllStatuses();

    onUpdate({
      viewMode,
      source: "sdk",
      connected: true,
      iracingRunning: true,
      racing: mapRacingTelemetry(
        telemetry,
        session,
        stint,
        recentLaps,
        liveSectors,
        pitDurationSec,
        pitTimeEstimated,
        sessionYaml,
        stintLapsByCar,
        opponentSectors,
        this.opponentSectorTracker.sessionBestSectors(),
        liveStandingsSectorStatuses,
        this.panelPrefs.relativeAhead,
        this.panelPrefs.relativeBehind,
        fuelLapsRemaining,
      ),
      garage: mapGarageTelemetry(
        telemetry,
        session,
        stintRecords,
        stint,
        pitDurationSec,
        pitTimeEstimated,
        opponentSectors,
        this.opponentSectorTracker.sessionBestSectors(),
        stintLapsByCar,
        sessionYaml,
        this.playerSectorTracker.getPersonalBestSectors(),
      ),
    });
  }

  private emitWaiting(
    onUpdate: (payload: TelemetryEnvelope) => void,
    iracingRunning: boolean,
  ): void {
    onUpdate({
      viewMode: "hidden",
      source: "sdk",
      connected: false,
      iracingRunning,
      racing: null,
      garage: null,
    });
  }

  stop(): void {
    this.stintHistory.reset();
    this.stintIndexTracker.reset();
    this.pitDurationTracker.reset();
    this.pitRoadTracker.reset();
    this.opponentSectorTracker.reset();
    this.liveStandingsSectorTracker.reset();
    this.playerSectorTracker.reset();
    this.racingLapHistory.reset();
    this.carStintLapTracker.reset();
    this.fuelTracker.reset();
    this.running = false;
    this.telemMissTicks = 0;
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
  }
}
