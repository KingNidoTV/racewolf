import type { SessionData } from "@irsdk-node/types";
import {
  buildSessionBestLapByCarIdx,
  resolveSessionBestLapSec,
} from "./sessionResults";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function findLeaderCarIdx(
  positions: number[],
  classPositions: number[],
  useClassPos: boolean,
): number {
  let leaderIdx = -1;
  let bestPos = 9999;
  for (let idx = 0; idx < positions.length; idx++) {
    const pos = useClassPos ? classPositions[idx] : positions[idx];
    if (pos > 0 && pos < bestPos) {
      bestPos = pos;
      leaderIdx = idx;
    }
  }
  return leaderIdx;
}

/** Meilleur tour session par CarIdx (SDK + ResultsPositions). */
export function buildResolvedBestLapMap(
  telemetry: Record<string, unknown>,
  session: SessionData,
  telemetryBest: number[],
  lastLaps: number[],
): Map<number, number> {
  const sessionNum = num(telemetry.SessionNum, 0);
  const sessionBests = buildSessionBestLapByCarIdx(session, sessionNum);
  const map = new Map<number, number>();

  for (let idx = 0; idx < telemetryBest.length; idx++) {
    const resolved = resolveSessionBestLapSec(
      idx,
      telemetryBest[idx] ?? -1,
      sessionBests,
      lastLaps[idx] ?? -1,
    );
    if (resolved > 0) map.set(idx, resolved);
  }
  return map;
}

export function leaderBestFromMap(
  leaderIdx: number,
  resolved: Map<number, number>,
): number {
  if (leaderIdx < 0) return -1;
  return resolved.get(leaderIdx) ?? -1;
}
