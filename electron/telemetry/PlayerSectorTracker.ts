import type { SessionData } from "@irsdk-node/types";
import type { SectorStatus } from "../../src/types/telemetry";
import { classifySectorSplit } from "../../src/utils/sectorStatus";
import {
  getSectorBoundaries,
  interpolateBoundaryCrossingTime,
  sectorIndexFromLapDistPct,
} from "../../src/utils/sectorGeometry";
import { formatSectorTime } from "../irsdk/format";
import { getSectorCount } from "../irsdk/sectorConfig";
import {
  readPlayerRaceContext,
  type PlayerRaceContext,
} from "../irsdk/playerRaceContext";
import {
  readBestLapSectorSecs,
  readCurrentLapSectorSecs,
  readLastLapSectorSecs,
} from "../irsdk/sectorTelemetry";
import { readLapCompleted, readSessionNum } from "./sessionScope";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const MIN_SPLIT = 2;
const MAX_SPLIT = 180;

export interface LiveSectorTiming {
  sectorTimes: string[];
  sectorStatus: SectorStatus[];
}

/**
 * Secteurs affichés :
 * - Début de tour : garder les secteurs du tour précédent.
 * - S1 terminé : nouveau S1, S2/S3 vides jusqu’à leur split.
 * - Nouveau relais : tout est remis à zéro.
 * - Ignore S1 après retour towing/garage ; ignore dernier secteur si ligne franchie aux stands.
 *
 * Temps : interpolation SessionTime×LapDistPct au franchissement (comme iRacing).
 */
export class PlayerSectorTracker {
  private sessionUniqueId = -1;
  private sessionNum = -1;
  private lastStintIndex = -1;
  private lastLapCompleted = -1;
  private boundaries: number[] = [0];
  private maxSectorIdx = 2;
  private lap = -1;
  private sector = 0;
  private sectorStart = -1;
  private prevPct = -1;
  private prevTime = -1;
  private onPit = false;
  private suppressFirstSector = false;
  private wasInGarage = false;
  private wasTowing = false;
  private currentLapSectors: number[] = [-1, -1, -1];
  private lastLapSectors: number[] = [-1, -1, -1];
  private personalBest: number[] = [-1, -1, -1];
  private sessionBest: number[] = [-1, -1, -1];
  private currentStatuses: SectorStatus[] = ["slower", "slower", "slower"];
  private lastLapStatuses: SectorStatus[] = ["slower", "slower", "slower"];

  private emptySecs(): number[] {
    return Array.from({ length: this.maxSectorIdx + 1 }, () => -1);
  }

  private emptyStatuses(fill: SectorStatus = "slower"): SectorStatus[] {
    return Array.from({ length: this.maxSectorIdx + 1 }, () => fill);
  }

  configure(session: SessionData): void {
    this.boundaries = getSectorBoundaries(session);
    this.maxSectorIdx = Math.max(0, getSectorCount(session) - 1);
    this.prevPct = -1;
    this.prevTime = -1;
    this.resetDisplayState();
    this.personalBest = this.emptySecs();
    this.sessionBest = this.emptySecs();
  }

  reset(): void {
    this.sessionUniqueId = -1;
    this.sessionNum = -1;
    this.lastStintIndex = -1;
    this.lastLapCompleted = -1;
    this.lap = -1;
    this.sector = 0;
    this.sectorStart = -1;
    this.prevPct = -1;
    this.prevTime = -1;
    this.onPit = false;
    this.suppressFirstSector = false;
    this.wasInGarage = false;
    this.wasTowing = false;
    this.resetDisplayState();
    this.personalBest = this.emptySecs();
    this.sessionBest = this.emptySecs();
  }

  /** Sortie des stands : chronos remis à zéro, ignorer le prochain S1. */
  onPitExit(): void {
    this.resetDisplayState();
    this.suppressFirstSector = true;
    this.lap = -1;
    this.sector = 0;
    this.sectorStart = -1;
    this.prevPct = -1;
    this.prevTime = -1;
  }

  private resetLapState(): void {
    this.currentLapSectors = this.emptySecs();
    this.currentStatuses = this.emptyStatuses();
  }

  private resetDisplayState(): void {
    this.resetLapState();
    this.lastLapSectors = this.emptySecs();
    this.lastLapStatuses = this.emptyStatuses();
  }

  private sectorIndex(pct: number): number {
    return Math.min(
      sectorIndexFromLapDistPct(pct, this.boundaries),
      this.maxSectorIdx,
    );
  }

  private crossingTime(
    pct: number,
    sessionTime: number,
    boundary: number,
  ): number {
    if (this.prevPct < 0 || this.prevTime < 0) return sessionTime;
    return interpolateBoundaryCrossingTime(
      this.prevPct,
      this.prevTime,
      pct,
      sessionTime,
      boundary,
    );
  }

  private mergeSessionBestFloor(floor: number[]): void {
    for (let i = 0; i < floor.length; i++) {
      const v = floor[i];
      if (v > 0 && (this.sessionBest[i] < 0 || v < this.sessionBest[i])) {
        this.sessionBest[i] = v;
      }
    }
  }

  private seedBestsFromSdk(
    telemetry: Record<string, unknown>,
    sectorCount: number,
  ): void {
    const best = readBestLapSectorSecs(telemetry, sectorCount);
    for (let i = 0; i < sectorCount; i++) {
      const v = best[i] ?? -1;
      if (v > 0) {
        if (this.personalBest[i] < 0 || v < this.personalBest[i]) {
          this.personalBest[i] = v;
        }
        if (this.sessionBest[i] < 0 || v < this.sessionBest[i]) {
          this.sessionBest[i] = v;
        }
      }
    }
  }

  private preferSdkSector(tracked: number, sdk: number): number {
    if (sdk >= 0 && sdk < 600) return sdk;
    return tracked;
  }

  private statusForSector(index: number, split: number): SectorStatus {
    return classifySectorSplit(
      split,
      this.personalBest[index] ?? -1,
      this.sessionBest[index] ?? -1,
    );
  }

  private shouldSkipSectorCompletion(
    index: number,
    ctx: PlayerRaceContext,
  ): boolean {
    if (index === 0 && this.suppressFirstSector) return true;
    if (index === this.maxSectorIdx && ctx.onPit) return true;
    return false;
  }

  private tryCompleteSector(
    index: number,
    split: number,
    ctx: PlayerRaceContext,
  ): void {
    if (this.shouldSkipSectorCompletion(index, ctx)) {
      if (index === 0 && this.suppressFirstSector) {
        this.suppressFirstSector = false;
      }
      return;
    }
    this.completeSector(index, split);
  }

  private completeSector(index: number, split: number): void {
    if (index < 0 || index > this.maxSectorIdx) return;
    if (split < MIN_SPLIT || split > MAX_SPLIT) return;

    this.currentLapSectors[index] = split;
    this.currentStatuses[index] = this.statusForSector(index, split);

    if (
      this.personalBest[index] < 0 ||
      split < this.personalBest[index] - 0.0005
    ) {
      this.personalBest[index] = split;
    }
    if (
      this.sessionBest[index] < 0 ||
      split < this.sessionBest[index] - 0.0005
    ) {
      this.sessionBest[index] = split;
    }
  }

  private commitLastLap(
    telemetry: Record<string, unknown>,
    sectorCount: number,
  ): void {
    const sdkLast = readLastLapSectorSecs(telemetry, sectorCount);

    for (let i = 0; i < sectorCount; i++) {
      const sdk = sdkLast[i] ?? -1;
      const tracked = this.currentLapSectors[i] ?? -1;
      const v = this.preferSdkSector(tracked, sdk);
      if (v < 0) continue;

      this.lastLapSectors[i] = v;
      this.lastLapStatuses[i] = this.statusForSector(i, v);
    }
  }

  private currentSec(index: number): number {
    return this.currentLapSectors[index] ?? -1;
  }

  private highestCompletedIndex(): number {
    let highest = -1;
    for (let i = 0; i <= this.maxSectorIdx; i++) {
      if (this.currentSec(i) >= 0) highest = i;
    }
    return highest;
  }

  private handleGarageAndTowing(ctx: PlayerRaceContext): boolean {
    if (ctx.inGarage || ctx.towing) {
      this.wasInGarage = ctx.inGarage;
      this.wasTowing = ctx.towing;
      this.suppressFirstSector = true;
      return true;
    }

    if (this.wasInGarage || this.wasTowing) {
      this.wasInGarage = false;
      this.wasTowing = false;
      this.suppressFirstSector = true;
      this.resetLapState();
      this.sectorStart = -1;
      this.prevPct = -1;
      this.prevTime = -1;
    }

    return false;
  }

  private rememberSample(pct: number, sessionTime: number): void {
    this.prevPct = pct;
    this.prevTime = sessionTime;
  }

  /** Qualif → course, ou nouvelle session : tout remettre à zéro. */
  private onSessionChange(
    session: SessionData,
    telemetry: Record<string, unknown>,
    sectorCount: number,
  ): void {
    this.configure(session);
    this.lap = -1;
    this.lastLapCompleted = readLapCompleted(telemetry);
    this.resetDisplayState();
    this.personalBest = this.emptySecs();
    this.sessionBest = this.emptySecs();
    this.prevPct = -1;
    this.prevTime = -1;
    this.seedBestsFromSdk(telemetry, sectorCount);
  }

  private syncSessionScope(
    telemetry: Record<string, unknown>,
    session: SessionData,
    sectorCount: number,
  ): void {
    const uid = num(telemetry.SessionUniqueID, -1);
    const sessionNum = readSessionNum(telemetry);

    if (uid >= 0 && uid !== this.sessionUniqueId) {
      this.sessionUniqueId = uid;
      this.sessionNum = sessionNum;
      this.onSessionChange(session, telemetry, sectorCount);
      this.lap = -1;
      this.lastStintIndex = -1;
      return;
    }

    if (
      sessionNum >= 0 &&
      this.sessionNum >= 0 &&
      sessionNum !== this.sessionNum
    ) {
      this.sessionNum = sessionNum;
      this.onSessionChange(session, telemetry, sectorCount);
      return;
    }

    if (sessionNum >= 0 && this.sessionNum < 0) {
      this.sessionNum = sessionNum;
      this.lastLapCompleted = readLapCompleted(telemetry);
    }
  }

  tick(
    telemetry: Record<string, unknown>,
    session: SessionData,
    stintIndex = 0,
  ): void {
    const sectorCount = getSectorCount(session);
    const ctx = readPlayerRaceContext(telemetry);

    this.syncSessionScope(telemetry, session, sectorCount);

    if (
      this.lastStintIndex >= 0 &&
      stintIndex !== this.lastStintIndex
    ) {
      this.resetDisplayState();
      this.lap = -1;
      this.lastStintIndex = stintIndex;
      this.suppressFirstSector = true;
      this.prevPct = -1;
      this.prevTime = -1;
    } else if (this.lastStintIndex < 0) {
      this.lastStintIndex = stintIndex;
    }

    if (this.handleGarageAndTowing(ctx)) {
      this.onPit = ctx.onPit;
      return;
    }

    const sessionTime = num(telemetry.SessionTime, -1);
    const lap = num(telemetry.Lap, 0);
    const lapCompleted = readLapCompleted(telemetry);
    const pctArr = telemetry.CarIdxLapDistPct as number[] | undefined;
    const pct = Array.isArray(pctArr)
      ? (pctArr[ctx.playerIdx] ?? -1)
      : -1;
    if (sessionTime < 0 || pct < 0 || pct > 1.02) {
      this.onPit = ctx.onPit;
      return;
    }

    if (lap !== this.lap) {
      const lapEndOnPit = ctx.onPit || this.onPit;
      const lapCounted =
        lapCompleted < 0 ||
        this.lastLapCompleted < 0 ||
        lapCompleted > this.lastLapCompleted;

      if (this.lap >= 0 && this.sectorStart >= 0 && !lapEndOnPit && lapCounted) {
        const crossT = this.crossingTime(pct, sessionTime, 0);
        const split = crossT - this.sectorStart;
        this.tryCompleteSector(this.sector, split, ctx);
      }

      if (this.lap >= 0 && !lapEndOnPit && lapCounted) {
        this.commitLastLap(telemetry, sectorCount);
      }

      this.lap = lap;
      if (lapCompleted >= 0) this.lastLapCompleted = lapCompleted;
      this.sector = this.sectorIndex(pct);
      this.sectorStart = this.crossingTime(pct, sessionTime, 0);
      this.resetLapState();
      this.onPit = ctx.onPit;
      this.rememberSample(pct, sessionTime);
      return;
    }

    const sec = this.sectorIndex(pct);
    if (sec > this.sector && this.sectorStart >= 0) {
      const boundary = this.boundaries[sec] ?? 0;
      const crossT = this.crossingTime(pct, sessionTime, boundary);
      const split = crossT - this.sectorStart;
      this.tryCompleteSector(this.sector, split, ctx);
      this.sector = sec;
      this.sectorStart = crossT;
    } else if (sec < this.sector && pct < 0.06) {
      this.sector = sec;
      this.sectorStart = sessionTime;
    }

    this.onPit = ctx.onPit;
    this.rememberSample(pct, sessionTime);
  }

  getLiveTiming(
    telemetry: Record<string, unknown>,
    session: SessionData,
    opponentSessionBest?: number[],
  ): LiveSectorTiming {
    const sectorCount = Math.max(1, getSectorCount(session));
    this.maxSectorIdx = Math.max(0, sectorCount - 1);
    if (this.currentLapSectors.length !== sectorCount) {
      this.resetDisplayState();
      if (this.personalBest.length !== sectorCount) {
        this.personalBest = this.emptySecs();
        this.sessionBest = this.emptySecs();
      }
    }
    if (opponentSessionBest) {
      this.mergeSessionBestFloor(opponentSessionBest);
    }
    this.seedBestsFromSdk(telemetry, sectorCount);

    const sdkCurrent = readCurrentLapSectorSecs(telemetry, sectorCount);
    const sdkLast = readLastLapSectorSecs(telemetry, sectorCount);
    const highestCompleted = this.highestCompletedIndex();
    const activeSector = this.sector;
    const timesSec = Array.from({ length: sectorCount }, () => -1);
    const statuses: SectorStatus[] = Array.from(
      { length: sectorCount },
      () => "pending" as const,
    );

    for (let i = 0; i < sectorCount; i++) {
      const curTracked = this.currentSec(i);
      const sdkCur = sdkCurrent[i] ?? -1;
      const sdkUsable =
        sdkCur >= 0 && (curTracked >= 0 || i <= activeSector);

      if (curTracked >= 0 || sdkUsable) {
        const cur = this.preferSdkSector(
          curTracked,
          sdkUsable ? sdkCur : -1,
        );
        timesSec[i] = cur;
        statuses[i] = this.statusForSector(i, cur);
        if (curTracked < 0 && sdkUsable && sdkCur >= 0) {
          this.currentLapSectors[i] = sdkCur;
          this.currentStatuses[i] = statuses[i];
        }
        continue;
      }

      if (highestCompleted < 0) {
        const lastTracked = this.lastLapSectors[i] ?? -1;
        const last = this.preferSdkSector(lastTracked, sdkLast[i] ?? -1);
        if (last >= 0) {
          timesSec[i] = last;
          statuses[i] = this.statusForSector(i, last);
        }
      }
    }

    return {
      sectorTimes: timesSec.map((sec) =>
        formatSectorTime(sec >= 0 ? sec : null),
      ),
      sectorStatus: statuses,
    };
  }

  getLastLapSectors(): number[] {
    return Array.from(
      { length: this.maxSectorIdx + 1 },
      (_, i) => this.lastLapSectors[i] ?? -1,
    );
  }

  getPersonalBestSectors(): number[] {
    return Array.from(
      { length: this.maxSectorIdx + 1 },
      (_, i) => this.personalBest[i] ?? -1,
    );
  }
}
