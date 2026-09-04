import type { SessionData } from "@irsdk-node/types";
import type {
  LiveFuel,
  LiveRaceSnapshot,
  LiveSession,
  LiveSessionFlag,
  LiveStint,
} from "../../src/endurance/live/models";
import {
  DEFAULT_LIVE_FUEL,
  DEFAULT_LIVE_RACE_SNAPSHOT,
  DEFAULT_LIVE_SESSION,
  DEFAULT_LIVE_STINT,
} from "../../src/endurance/live/models";
import { resolveTrackFlag } from "../../src/utils/trackFlags";
import { CarStintLapTracker } from "../telemetry/CarStintLapTracker";
import { StintIndexTracker } from "../telemetry/StintIndexTracker";
import { FuelTelemetryTracker } from "./FuelTelemetryTracker";
import { celsiusFromSdk, mapIracingWeather } from "./weather";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sessionTypeLabel(session: SessionData, sessionNum: number): string {
  const sessions = session.SessionInfo?.Sessions ?? [];
  const current = sessions.find((s) => s.SessionNum === sessionNum);
  return current?.SessionType ?? current?.SessionName ?? "—";
}

function isRaceSession(sessionType: string): boolean {
  return /\brace\b/i.test(sessionType);
}

function readSessionNames(session: SessionData): {
  trackName: string | null;
  carName: string | null;
  driverName: string | null;
} {
  const weekend = session.WeekendInfo;
  const trackName =
    weekend?.TrackDisplayName ?? weekend?.TrackName ?? null;
  const playerIdx = session.DriverInfo?.DriverCarIdx ?? 0;
  const driver = session.DriverInfo?.Drivers?.find(
    (d) => d.CarIdx === playerIdx,
  );
  const carName =
    driver?.CarScreenName ??
    driver?.CarPath?.split("/").pop()?.replace(/_/g, " ") ??
    weekend?.Category ??
    null;
  const driverName =
    driver?.UserName ?? driver?.UserID ?? null;
  return {
    trackName: trackName ? String(trackName) : null,
    carName: carName ? String(carName) : null,
    driverName: driverName ? String(driverName) : null,
  };
}

function mapSessionFlag(sessionFlags: number): LiveSessionFlag {
  const track = resolveTrackFlag(sessionFlags);
  if (!track) return "unknown";
  switch (track.kind) {
    case "checkered":
      return "checkered";
    case "red":
      return "red";
    case "caution":
    case "yellow-waving":
      return "safety_car";
    case "yellow":
      return "yellow";
    case "green":
    case "start":
    case "one-lap-green":
      return "green";
    default:
      return "unknown";
  }
}

function formatGameClock(sessionTimeOfDaySec: number): string | null {
  if (sessionTimeOfDaySec <= 0) return null;
  const s = Math.floor(sessionTimeOfDaySec % 86400);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function playerOnPit(telemetry: Record<string, unknown>): boolean {
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  const onPitRoadArr = telemetry.CarIdxOnPitRoad as boolean[] | undefined;
  const onPitRoad = Array.isArray(onPitRoadArr)
    ? Boolean(onPitRoadArr[playerIdx])
    : Boolean(telemetry.OnPitRoad);
  const pitActive = Boolean(telemetry.PitstopActive);
  const inStall = num(telemetry.PlayerCarInPitStall, 0) > 0;
  return onPitRoad || pitActive || inStall;
}

/** Suit les sorties de pit pour incrémenter le numéro de relais. */
class PitExitDetector {
  private wasOnPit = false;
  private hasObservedTrack = false;

  reset(): void {
    this.wasOnPit = false;
    this.hasObservedTrack = false;
  }

  tick(
    telemetry: Record<string, unknown>,
    onExit: () => void,
  ): boolean {
    const onPit = playerOnPit(telemetry);
    // Si RaceWolf démarre alors que la voiture est déjà aux stands/grille,
    // la première sortie initialise le relais 1 au lieu de passer au relais 2.
    if (this.wasOnPit && !onPit && this.hasObservedTrack) {
      onExit();
    }
    if (!onPit) this.hasObservedTrack = true;
    this.wasOnPit = onPit;
    return onPit;
  }
}

export class LiveRaceMapper {
  private fuelTracker = new FuelTelemetryTracker();
  private carStintLapTracker = new CarStintLapTracker();
  private stintIndexTracker = new StintIndexTracker();
  private pitExitDetector = new PitExitDetector();
  private sessionUniqueId = -1;

  reset(): void {
    this.fuelTracker.reset();
    this.carStintLapTracker.reset();
    this.stintIndexTracker.reset();
    this.pitExitDetector.reset();
    this.sessionUniqueId = -1;
  }

  map(
    telemetry: Record<string, unknown>,
    session: SessionData,
  ): LiveRaceSnapshot {
    const uid = num(telemetry.SessionUniqueID, -1);
    if (uid >= 0 && uid !== this.sessionUniqueId) {
      this.sessionUniqueId = uid;
      this.carStintLapTracker.reset();
      this.stintIndexTracker.reset();
      this.pitExitDetector.reset();
      this.fuelTracker.reset();
    }

    this.fuelTracker.tick(telemetry);
    const stintLapsByCar = this.carStintLapTracker.tick(telemetry);
    const playerIdx = num(telemetry.PlayerCarIdx, 0);
    const enPit = this.pitExitDetector.tick(telemetry, () => {
      this.stintIndexTracker.onPitExit(telemetry);
    });
    const stintRuntime = this.stintIndexTracker.tick(telemetry);
    const stintLaps =
      stintLapsByCar.get(playerIdx) ?? stintRuntime.stintLaps;

    const sessionNum = num(telemetry.SessionNum, 0);
    const sessionType = sessionTypeLabel(session, sessionNum);
    const isRace = isRaceSession(sessionType);
    const { trackName, carName, driverName } = readSessionNames(session);

    const sessionFlags = num(telemetry.SessionFlags, 0);
    const skies = num(telemetry.Skies, 0);
    const wetness = num(telemetry.TrackWetness, 0);
    const weatherInfo = mapIracingWeather(skies, wetness);

    const fuelLevel = num(telemetry.FuelLevel, 0);
    const fuelPct = num(telemetry.FuelLevelPct, 0);
    const capacity = Math.max(
      this.fuelTracker.tankCapacityLitres,
      fuelLevel,
    );
    const lapTime =
      num(telemetry.LapLastLapTime, 0) ||
      num(telemetry.LapBestLapTime, 0) ||
      90;
    const consoParTour = this.fuelTracker.avgLitresPerLap;
    const toursRestantsFuel =
      this.fuelTracker.estimatedLapsRemaining(fuelLevel, lapTime) ?? 0;

    const repairLeft = num(telemetry.PitRepairLeft, 0);
    const inRepair =
      enPit && num(telemetry.PlayerCarInPitStall, 0) > 0 && repairLeft > 0;

    let sessionTimeRemain = num(telemetry.SessionTimeRemain, -1);
    if (sessionTimeRemain < 0) {
      const sessionTimeTotal = num(telemetry.SessionTimeTotal, -1);
      const sessionTimeElapsed = num(telemetry.SessionTime, 0);
      if (sessionTimeTotal > 0) {
        sessionTimeRemain = Math.max(0, sessionTimeTotal - sessionTimeElapsed);
      }
    }
    let sessionLapsRemain = num(telemetry.SessionLapsRemainEx, -1);
    if (sessionLapsRemain < 0) {
      const legacy = num(telemetry.SessionLapsRemain, -1);
      if (legacy >= 0) {
        sessionLapsRemain = legacy;
      }
    }
    const sessionTimeOfDay = num(telemetry.SessionTimeOfDay, 0);

    const airTemp = celsiusFromSdk(num(telemetry.AirTemp, 0));
    const trackTemp = celsiusFromSdk(
      num(telemetry.TrackTempCrew, 0) || num(telemetry.TrackTemp, 0),
    );

    const lastLapTime = num(telemetry.LapLastLapTime, 0);

    const liveSession: LiveSession = {
      sessionUniqueId: uid,
      connected: true,
      iracingRunning: true,
      source: "sdk",
      sessionType,
      isRace,
      sessionTimeSec: Math.max(0, num(telemetry.SessionTime, 0)),
      sessionLaps: Math.max(0, num(telemetry.Lap, 0)),
      flag: mapSessionFlag(sessionFlags),
      weather: weatherInfo.weather,
      trackTempCelsius: trackTemp,
      airTempCelsius: airTemp,
      rainIntensityPercent: weatherInfo.rainIntensityPercent,
      cielLabel: weatherInfo.cielLabel,
      pisteHumiditeLabel: weatherInfo.pisteLabel,
      sessionTimeRemainingSec: sessionTimeRemain >= 0 ? sessionTimeRemain : null,
      sessionLapsRemaining: sessionLapsRemain >= 0 ? sessionLapsRemain : null,
      gameClock: formatGameClock(sessionTimeOfDay),
      trackName,
      carName,
      error: null,
      updatedAt: new Date().toISOString(),
      repairTimeLeftSec: inRepair ? repairLeft : 0,
      driverName,
    };

    const liveStint: LiveStint = {
      numeroRelais: stintRuntime.index + 1,
      sdkStintIndex: stintRuntime.index + 1,
      piloteId: null,
      piloteNom: driverName,
      toursCompletes: stintLaps,
      toursPrevus: 0,
      toursRestants: 0,
      dureeEcouleeSec: stintRuntime.stintTimeSec,
      dureePrevueSec: 0,
      enPit,
      changementPneusPrevu: false,
      dernierTourSecondes: lastLapTime > 0 ? lastLapTime : 0,
      deltaDernierTourSec: null,
      deltaCumuleeTempsSec: 0,
      deltaDernierTourLabel: null,
      deltaCumuleeTempsLabel: "0.00 s",
      deltaDernierTourConsoLitres: null,
      deltaCumuleeConsoLitres: 0,
      historiqueTours: [],
    };

    const liveFuel: LiveFuel = {
      niveauLitres: Math.round(fuelLevel * 10) / 10,
      capaciteLitres: capacity,
      pourcentage: Math.round(fuelPct * 100),
      consommationLitresParTour: Math.round(consoParTour * 100) / 100,
      toursRestantsEstimes: toursRestantsFuel,
      estime: this.fuelTracker.consumptionIsEstimated,
      consoPrevueLitresParTour: 0,
      deltaDernierTourConsoLitres: null,
      deltaCumuleeConsoLitres: 0,
      deltaDernierTourConsoLabel: null,
      deltaCumuleeConsoLabel: "0.00 L",
    };

    return {
      session: liveSession,
      stint: liveStint,
      fuel: liveFuel,
      strategy: { ...DEFAULT_LIVE_RACE_SNAPSHOT.strategy },
    };
  }
}
