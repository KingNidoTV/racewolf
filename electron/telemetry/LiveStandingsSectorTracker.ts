import type { SessionData } from "@irsdk-node/types";
import type { SectorStatus } from "../../src/types/telemetry";
import { classifySectorSplit } from "../../src/utils/sectorStatus";
import {
  getSectorBoundaries,
  interpolateBoundaryCrossingTime,
  sectorIndexFromLapDistPct,
} from "../../src/utils/sectorGeometry";
import { getSectorCount } from "../irsdk/sectorConfig";
import { readPlayerRaceContext } from "../irsdk/playerRaceContext";
import { readBestLapSectorSecs } from "../irsdk/sectorTelemetry";
import { readSessionNum } from "./sessionScope";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const MIN_SPLIT = 2;
const MAX_SPLIT = 180;

type CarState = {
  lap: number;
  sector: number;
  sectorStartTime: number;
  prevPct: number;
  prevTime: number;
  personalBest: number[];
  currentLapSectors: number[];
  currentStatuses: SectorStatus[];
  suppressFirstSector: boolean;
  onPitRoad: boolean;
  wasInGarage: boolean;
  wasTowing: boolean;
};

export interface LiveStandingsSectorTickOptions {
  playerIdx: number;
  stintIndex: number;
  sessionBestFloor?: number[];
  opponentBests?: Map<number, number[]>;
}

/**
 * Secteurs live pour le classement P/Q :
 * gris = pas encore franchi ce tour ; couleur figée jusqu’au tour suivant.
 */
export class LiveStandingsSectorTracker {
  private sessionUniqueId = -1;
  private sessionNum = -1;
  private boundaries: number[] = [0];
  private sectorCount = 3;
  private maxSectorIdx = 2;
  private playerIdx = -1;
  private lastPlayerStintIndex = -1;
  private sessionBest: number[] = [];
  private cars = new Map<number, CarState>();
  private prevOnPit = new Map<number, boolean>();

  configure(session: SessionData): void {
    this.boundaries = getSectorBoundaries(session);
    this.sectorCount = getSectorCount(session);
    this.maxSectorIdx = Math.max(0, this.sectorCount - 1);
    this.sessionBest = this.createArray(-1);
  }

  private createArray(fill: number): number[] {
    return Array.from({ length: this.sectorCount }, () => fill);
  }

  private createPendingStatuses(): SectorStatus[] {
    return Array.from({ length: this.sectorCount }, () => "pending" as const);
  }

  reset(): void {
    this.cars.clear();
    this.prevOnPit.clear();
    this.sessionUniqueId = -1;
    this.sessionNum = -1;
    this.lastPlayerStintIndex = -1;
    this.playerIdx = -1;
  }

  private sectorIndex(lapDistPct: number): number {
    return Math.min(
      sectorIndexFromLapDistPct(lapDistPct, this.boundaries),
      this.maxSectorIdx,
    );
  }

  private crossingTime(
    state: CarState,
    pct: number,
    sessionTime: number,
    boundary: number,
  ): number {
    if (state.prevPct < 0 || state.prevTime < 0) return sessionTime;
    return interpolateBoundaryCrossingTime(
      state.prevPct,
      state.prevTime,
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

  private seedPersonalBest(
    carIdx: number,
    telemetry: Record<string, unknown>,
    opponentBests?: Map<number, number[]>,
  ): number[] {
    const out = this.createArray(-1);
    const tracked = opponentBests?.get(carIdx);
    if (tracked) {
      for (let i = 0; i < this.sectorCount; i++) {
        const v = tracked[i] ?? -1;
        if (v > 0) out[i] = v;
      }
    }
    if (carIdx === this.playerIdx) {
      const sdk = readBestLapSectorSecs(telemetry, this.sectorCount);
      for (let i = 0; i < this.sectorCount; i++) {
        const v = sdk[i] ?? -1;
        if (v > 0 && (out[i] < 0 || v < out[i])) out[i] = v;
      }
    }
    return out;
  }

  private resetLapState(state: CarState): void {
    state.currentLapSectors = this.createArray(-1);
    state.currentStatuses = this.createPendingStatuses();
  }

  private onCarPitExit(state: CarState): void {
    this.resetLapState(state);
    state.suppressFirstSector = true;
    state.sectorStartTime = -1;
    state.prevPct = -1;
    state.prevTime = -1;
  }

  private shouldSkipSectorCompletion(
    state: CarState,
    index: number,
  ): boolean {
    if (index === 0 && state.suppressFirstSector) {
      state.suppressFirstSector = false;
      return true;
    }
    if (index === this.maxSectorIdx && state.onPitRoad) return true;
    return false;
  }

  private completeSector(state: CarState, index: number, split: number): void {
    if (index < 0 || index > this.maxSectorIdx) return;
    if (split < MIN_SPLIT || split > MAX_SPLIT) return;

    const personal = state.personalBest[index] ?? -1;
    const session = this.sessionBest[index] ?? -1;
    state.currentLapSectors[index] = split;
    state.currentStatuses[index] = classifySectorSplit(split, personal, session);

    if (personal < 0 || split < personal - 0.0005) {
      state.personalBest[index] = split;
    }
    if (session < 0 || split < session - 0.0005) {
      this.sessionBest[index] = split;
    }
  }

  private tryCompleteSector(
    state: CarState,
    index: number,
    split: number,
  ): void {
    if (this.shouldSkipSectorCompletion(state, index)) return;
    this.completeSector(state, index, split);
  }

  private createCarState(
    carIdx: number,
    lap: number,
    pct: number,
    sessionTime: number,
    telemetry: Record<string, unknown>,
    opponentBests?: Map<number, number[]>,
    previous?: CarState,
  ): CarState {
    const personalBest =
      previous && previous.personalBest.length === this.sectorCount
        ? [...previous.personalBest]
        : this.seedPersonalBest(carIdx, telemetry, opponentBests);

    return {
      lap,
      sector: this.sectorIndex(pct),
      sectorStartTime: sessionTime,
      prevPct: -1,
      prevTime: -1,
      personalBest,
      currentLapSectors: this.createArray(-1),
      currentStatuses: this.createPendingStatuses(),
      suppressFirstSector: previous?.suppressFirstSector ?? false,
      onPitRoad: previous?.onPitRoad ?? false,
      wasInGarage: false,
      wasTowing: false,
    };
  }

  private displayStatuses(state: CarState): SectorStatus[] {
    return Array.from({ length: this.sectorCount }, (_, i) => {
      if ((state.currentLapSectors[i] ?? -1) < 0) return "pending";
      return state.currentStatuses[i] ?? "pending";
    });
  }

  private handlePlayerGarage(
    carIdx: number,
    state: CarState,
    telemetry: Record<string, unknown>,
  ): boolean {
    if (carIdx !== this.playerIdx) return false;
    const ctx = readPlayerRaceContext(telemetry);

    if (ctx.inGarage || ctx.towing) {
      state.wasInGarage = ctx.inGarage;
      state.wasTowing = ctx.towing;
      state.suppressFirstSector = true;
      return true;
    }

    if (state.wasInGarage || state.wasTowing) {
      state.wasInGarage = false;
      state.wasTowing = false;
      state.suppressFirstSector = true;
      this.resetLapState(state);
      state.sectorStartTime = -1;
      state.prevPct = -1;
      state.prevTime = -1;
    }

    return false;
  }

  tick(
    telemetry: Record<string, unknown>,
    session: SessionData,
    options: LiveStandingsSectorTickOptions,
  ): void {
    const uid = num(telemetry.SessionUniqueID, -1);
    const sessionNum = readSessionNum(telemetry);
    this.playerIdx = options.playerIdx;

    if (uid >= 0 && uid !== this.sessionUniqueId) {
      this.sessionUniqueId = uid;
      this.sessionNum = sessionNum;
      this.cars.clear();
      this.prevOnPit.clear();
      this.configure(session);
      this.lastPlayerStintIndex = options.stintIndex;
    } else if (
      sessionNum >= 0 &&
      this.sessionNum >= 0 &&
      sessionNum !== this.sessionNum
    ) {
      this.sessionNum = sessionNum;
      this.cars.clear();
      this.prevOnPit.clear();
      this.configure(session);
      this.lastPlayerStintIndex = options.stintIndex;
    } else if (sessionNum >= 0 && this.sessionNum < 0) {
      this.sessionNum = sessionNum;
    }

    if (options.sessionBestFloor) {
      this.mergeSessionBestFloor(options.sessionBestFloor);
    }

    if (
      this.playerIdx >= 0 &&
      this.lastPlayerStintIndex >= 0 &&
      options.stintIndex !== this.lastPlayerStintIndex
    ) {
      const playerState = this.cars.get(this.playerIdx);
      if (playerState) {
        this.resetLapState(playerState);
        playerState.suppressFirstSector = true;
        playerState.lap = -1;
      }
      this.lastPlayerStintIndex = options.stintIndex;
    } else if (this.lastPlayerStintIndex < 0) {
      this.lastPlayerStintIndex = options.stintIndex;
    }

    const sessionTime = num(telemetry.SessionTime, -1);
    if (sessionTime < 0) return;

    const lapDist = telemetry.CarIdxLapDistPct as number[] | undefined;
    const laps = telemetry.CarIdxLap as number[] | undefined;
    const onPitRoadArr = telemetry.CarIdxOnPitRoad as boolean[] | undefined;
    if (!Array.isArray(lapDist)) return;

    for (let idx = 0; idx < lapDist.length; idx++) {
      const pct = lapDist[idx];
      if (!Number.isFinite(pct) || pct < 0 || pct > 1.02) continue;

      const lap = laps?.[idx] ?? 0;
      const onPit = Boolean(onPitRoadArr?.[idx]);
      const wasOnPit = this.prevOnPit.get(idx) ?? false;
      this.prevOnPit.set(idx, onPit);

      let state = this.cars.get(idx);
      if (!state) {
        state = this.createCarState(
          idx,
          lap,
          pct,
          sessionTime,
          telemetry,
          options.opponentBests,
        );
        this.cars.set(idx, state);
      }

      if (wasOnPit && !onPit) {
        this.onCarPitExit(state);
      }

      state.onPitRoad = onPit;

      if (this.handlePlayerGarage(idx, state, telemetry)) {
        continue;
      }

      if (lap !== state.lap) {
        const lapEndOnPit = onPit || wasOnPit;

        if (state.lap >= 0 && state.sectorStartTime >= 0 && !lapEndOnPit) {
          const crossT = this.crossingTime(state, pct, sessionTime, 0);
          const split = crossT - state.sectorStartTime;
          this.tryCompleteSector(state, state.sector, split);
        }

        state.lap = lap;
        state.sector = this.sectorIndex(pct);
        state.sectorStartTime = this.crossingTime(state, pct, sessionTime, 0);
        state.prevPct = pct;
        state.prevTime = sessionTime;
        this.resetLapState(state);
        continue;
      }

      const sec = this.sectorIndex(pct);
      if (sec > state.sector && state.sectorStartTime >= 0) {
        const boundary = this.boundaries[sec] ?? 0;
        const crossT = this.crossingTime(state, pct, sessionTime, boundary);
        const split = crossT - state.sectorStartTime;
        this.tryCompleteSector(state, state.sector, split);
        state.sector = sec;
        state.sectorStartTime = crossT;
      } else if (sec < state.sector && pct < 0.06) {
        state.sector = sec;
        state.sectorStartTime = sessionTime;
      }

      state.prevPct = pct;
      state.prevTime = sessionTime;
    }
  }

  getStatuses(carIdx: number): SectorStatus[] {
    const state = this.cars.get(carIdx);
    if (!state) return this.createPendingStatuses();
    return this.displayStatuses(state);
  }

  getAllStatuses(): Map<number, SectorStatus[]> {
    const out = new Map<number, SectorStatus[]>();
    for (const [idx, state] of this.cars) {
      out.set(idx, this.displayStatuses(state));
    }
    return out;
  }
}
