import type { SessionData } from "@irsdk-node/types";

export interface SessionCarBestLap {
  bestSec: number;
  bestLapNum: number;
}

/** Meilleurs tours par CarIdx depuis ResultsPositions / ResultsFastestLap (session en cours). */
export function buildSessionBestLapByCarIdx(
  session: SessionData,
  sessionNum: number,
): Map<number, SessionCarBestLap> {
  const map = new Map<number, SessionCarBestLap>();
  const sessions = session.SessionInfo?.Sessions ?? [];
  const current = sessions.find((s) => s.SessionNum === sessionNum);
  if (!current) return map;

  const merge = (carIdx: number, time: number, lap: number) => {
    if (!Number.isFinite(time) || time <= 0 || time >= 99999) return;
    const prev = map.get(carIdx);
    if (!prev || time < prev.bestSec) {
      map.set(carIdx, {
        bestSec: time,
        bestLapNum: lap > 0 ? lap : prev?.bestLapNum ?? 0,
      });
    }
  };

  for (const row of current.ResultsPositions ?? []) {
    merge(row.CarIdx, row.FastestTime, row.FastestLap);
  }
  for (const row of current.ResultsFastestLap ?? []) {
    merge(row.CarIdx, row.FastestTime, row.FastestLap);
  }

  return map;
}

/** Choisit le meilleur tour session : télémétrie SDK puis résultats session. */
export function resolveSessionBestLapSec(
  carIdx: number,
  telemetryBestSec: number,
  sessionBests: Map<number, SessionCarBestLap>,
  lastLapSec = -1,
): number {
  const candidates: number[] = [];
  if (telemetryBestSec > 0 && telemetryBestSec < 99999) {
    candidates.push(telemetryBestSec);
  }
  const fromSession = sessionBests.get(carIdx);
  if (fromSession && fromSession.bestSec > 0) {
    candidates.push(fromSession.bestSec);
  }
  if (lastLapSec > 0 && lastLapSec < 99999) {
    candidates.push(lastLapSec);
  }
  if (candidates.length === 0) return -1;
  return Math.min(...candidates);
}

export function resolveSessionBestLapNum(
  carIdx: number,
  telemetryLapNum: number,
  sessionBests: Map<number, SessionCarBestLap>,
  bestSec: number,
): number {
  if (telemetryLapNum > 0) return telemetryLapNum;
  const fromSession = sessionBests.get(carIdx);
  if (fromSession && fromSession.bestLapNum > 0) {
    if (bestSec < 0 || Math.abs(fromSession.bestSec - bestSec) < 0.05) {
      return fromSession.bestLapNum;
    }
  }
  return fromSession?.bestLapNum ?? 0;
}
