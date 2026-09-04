function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function playerBool(
  telemetry: Record<string, unknown>,
  key: string,
  playerIdx: number,
): boolean {
  const arr = telemetry[key] as boolean[] | undefined;
  if (Array.isArray(arr)) return Boolean(arr[playerIdx]);
  return Boolean(telemetry[key]);
}

function playerNum(
  telemetry: Record<string, unknown>,
  key: string,
  playerIdx: number,
): number {
  const arr = telemetry[key] as number[] | undefined;
  if (Array.isArray(arr)) return num(arr[playerIdx], 0);
  return num(telemetry[key], 0);
}

export interface PlayerRaceContext {
  playerIdx: number;
  onPitRoad: boolean;
  inPitStall: boolean;
  pitActive: boolean;
  onPit: boolean;
  towing: boolean;
  inGarage: boolean;
}

export function readPlayerRaceContext(
  telemetry: Record<string, unknown>,
): PlayerRaceContext {
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  const onPitRoad = playerBool(telemetry, "CarIdxOnPitRoad", playerIdx)
    || playerBool(telemetry, "OnPitRoad", playerIdx);
  const inPitStall = playerBool(telemetry, "PlayerCarInPitStall", playerIdx);
  const pitActive = Boolean(telemetry.PitstopActive);
  const towing = playerNum(telemetry, "PlayerCarTowTime", playerIdx) > 0;
  const inGarage = playerBool(telemetry, "IsInGarage", playerIdx);

  return {
    playerIdx,
    onPitRoad,
    inPitStall,
    pitActive,
    onPit: onPitRoad || inPitStall || pitActive,
    towing,
    inGarage,
  };
}

/** Stands session (pit lane / box), pas l’écran garage iRacing. */
export function isPlayerAtSessionPits(ctx: PlayerRaceContext): boolean {
  return ctx.onPit && !ctx.inGarage;
}

function playerHasTimedLap(
  resolvedBest: Map<number, number>,
  bestTimes: number[],
  playerIdx: number,
): boolean {
  const best = resolvedBest.get(playerIdx) ?? bestTimes[playerIdx] ?? -1;
  return best > 0;
}

/**
 * Pilote encore sans position de course ni chrono (stands ou piste après sortie box).
 * Reste visible au classement / relatif jusqu’au premier tour chronométré.
 */
export function isPlayerAwaitingRaceTiming(
  telemetry: Record<string, unknown>,
  session: { DriverInfo?: { Drivers?: { CarIdx?: number; UserName?: string; IsSpectator?: number }[] } },
  resolvedBest: Map<number, number>,
  bestTimes: number[],
  lapDistPct: number[],
  playerIdx: number,
  racePosition: number,
): boolean {
  if (racePosition >= 1) return false;
  if (playerHasTimedLap(resolvedBest, bestTimes, playerIdx)) return false;
  if (playerNum(telemetry, "PlayerCarTowTime", playerIdx) > 0) return false;

  const driver = session.DriverInfo?.Drivers?.find(
    (d) => d.CarIdx === playerIdx,
  );
  const name = driver?.UserName?.trim();
  if (!name || driver?.IsSpectator === 1) return false;

  const pct = lapDistPct[playerIdx] ?? -1;
  if (Number.isFinite(pct) && pct < 0) return false;

  return true;
}
