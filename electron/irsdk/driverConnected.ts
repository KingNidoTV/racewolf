import type { SessionData } from "@irsdk-node/types";

interface DriverRow {
  UserName?: string;
  IsSpectator?: number;
}

/** Pilote encore connecté (pas spectateur, position valide, pas retiré). */
export function isDriverConnected(
  session: SessionData,
  sessionNum: number,
  carIdx: number,
  position: number,
  driver: DriverRow | undefined,
  lapDistPct: number,
): boolean {
  const name = driver?.UserName?.trim();
  if (!name || driver?.IsSpectator === 1) return false;
  if (!position || position < 1) return false;

  const sessions = session.SessionInfo?.Sessions ?? [];
  const current = sessions.find((s) => s.SessionNum === sessionNum);
  const result = current?.ResultsPositions?.find((p) => p.CarIdx === carIdx);
  if (result?.ReasonOutId && result.ReasonOutId > 0) return false;

  // iRacing : CarIdxLapDistPct = -1 quand le pilote est déconnecté.
  if (Number.isFinite(lapDistPct) && lapDistPct < 0) return false;

  return true;
}
