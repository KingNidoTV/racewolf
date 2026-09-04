import type { SessionData } from "@irsdk-node/types";
import {
  getSectorBoundaries,
  interpolateBoundaryCrossingTime,
  sectorIndexFromLapDistPct,
} from "../../src/utils/sectorGeometry";
import { getSectorCount } from "../irsdk/sectorConfig";
import { readSessionNum } from "./sessionScope";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

type CarSectorState = {
  lap: number;
  sector: number;
  sectorStartTime: number;
  prevPct: number;
  prevTime: number;
  best: number[];
};

const MIN_SPLIT = 2;
const MAX_SPLIT = 180;

/**
 * Estime les meilleurs secteurs par voiture via CarIdxLapDistPct + SplitTimeInfo.
 * iRacing ne publie pas CarIdxBestLapTimeSector* pour les adversaires.
 */
export class OpponentSectorTracker {
  private sessionUniqueId = -1;
  private sessionNum = -1;
  private boundaries: number[] = [0];
  private sectorCount = 3;
  private maxSectorIdx = 2;
  private cars = new Map<number, CarSectorState>();

  configure(session: SessionData): void {
    this.boundaries = getSectorBoundaries(session);
    this.sectorCount = getSectorCount(session);
    this.maxSectorIdx = Math.max(0, this.sectorCount - 1);
  }

  private createBest(): number[] {
    return Array.from({ length: this.sectorCount }, () => -1);
  }

  reset(): void {
    this.cars.clear();
    this.sessionUniqueId = -1;
    this.sessionNum = -1;
  }

  private sectorIndex(lapDistPct: number): number {
    return Math.min(
      sectorIndexFromLapDistPct(lapDistPct, this.boundaries),
      this.maxSectorIdx,
    );
  }

  private crossingTime(
    state: CarSectorState,
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

  private recordSplit(
    state: CarSectorState,
    sectorIdx: number,
    splitSec: number,
  ): void {
    if (sectorIdx < 0 || sectorIdx > this.maxSectorIdx) return;
    if (splitSec < MIN_SPLIT || splitSec > MAX_SPLIT) return;
    const prev = state.best[sectorIdx] ?? -1;
    if (prev < 0 || splitSec < prev) {
      state.best[sectorIdx] = splitSec;
    }
  }

  tick(telemetry: Record<string, unknown>, session: SessionData): void {
    const uid = num(telemetry.SessionUniqueID, -1);
    const sessionNum = readSessionNum(telemetry);

    if (uid >= 0 && uid !== this.sessionUniqueId) {
      this.sessionUniqueId = uid;
      this.sessionNum = sessionNum;
      this.cars.clear();
      this.configure(session);
    } else if (
      sessionNum >= 0 &&
      this.sessionNum >= 0 &&
      sessionNum !== this.sessionNum
    ) {
      this.sessionNum = sessionNum;
      this.cars.clear();
      this.configure(session);
    } else if (sessionNum >= 0 && this.sessionNum < 0) {
      this.sessionNum = sessionNum;
    }

    const sessionTime = num(telemetry.SessionTime, -1);
    if (sessionTime < 0) return;

    const lapDist = telemetry.CarIdxLapDistPct as number[] | undefined;
    const laps = telemetry.CarIdxLap as number[] | undefined;
    if (!Array.isArray(lapDist)) return;

    for (let idx = 0; idx < lapDist.length; idx++) {
      const pct = lapDist[idx];
      if (!Number.isFinite(pct) || pct < 0 || pct > 1.02) continue;

      const lap = laps?.[idx] ?? 0;
      let state = this.cars.get(idx);

      if (!state || lap !== state.lap) {
        if (
          state &&
          lap > state.lap &&
          state.sector >= 0 &&
          state.sectorStartTime >= 0
        ) {
          const crossT = this.crossingTime(state, pct, sessionTime, 0);
          const finalSplit = crossT - state.sectorStartTime;
          this.recordSplit(state, state.sector, finalSplit);
        }
        const previousBest = state?.best ?? this.createBest();
        const crossT = state
          ? this.crossingTime(state, pct, sessionTime, 0)
          : sessionTime;
        state = {
          lap,
          sector: this.sectorIndex(pct),
          sectorStartTime: crossT,
          prevPct: pct,
          prevTime: sessionTime,
          best:
            previousBest.length === this.sectorCount
              ? [...previousBest]
              : this.createBest(),
        };
        this.cars.set(idx, state);
        continue;
      }

      const sec = this.sectorIndex(pct);
      if (sec > state.sector) {
        const boundary = this.boundaries[sec] ?? 0;
        const crossT = this.crossingTime(state, pct, sessionTime, boundary);
        const split = crossT - state.sectorStartTime;
        this.recordSplit(state, state.sector, split);
        state.sector = sec;
        state.sectorStartTime = crossT;
      } else if (sec < state.sector && pct < 0.08) {
        state.sector = sec;
        state.sectorStartTime = sessionTime;
      }

      state.prevPct = pct;
      state.prevTime = sessionTime;
    }
  }

  getBestSectors(carIdx: number): number[] {
    const state = this.cars.get(carIdx);
    return state ? [...state.best] : this.createBest();
  }

  /** Meilleur secteur session (toutes voitures suivies). */
  sessionBestSectors(): number[] {
    const out = this.createBest();
    for (const state of this.cars.values()) {
      for (let i = 0; i < this.sectorCount; i++) {
        const t = state.best[i];
        if (t > 0 && (out[i] < 0 || t < out[i])) out[i] = t;
      }
    }
    return out;
  }
}
