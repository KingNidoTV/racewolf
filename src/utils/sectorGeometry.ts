import type { SessionData } from "@irsdk-node/types";

/** Bornes de secteurs iRacing (LapDistPct 0–1), triées, espace jeu brut. */
export function getSectorBoundaries(session: SessionData | null | undefined): number[] {
  const sectors = [...(session?.SplitTimeInfo?.Sectors ?? [])].sort(
    (a, b) => (a.SectorNum ?? 0) - (b.SectorNum ?? 0),
  );
  const pcts = sectors
    .map((s) => Number(s.SectorStartPct))
    .filter((p) => Number.isFinite(p) && p >= 0 && p <= 1);

  if (pcts.length === 0) return [0];

  // Garantit un secteur 0 à la ligne (comme iRacing).
  if (pcts[0]! > 0.0005) pcts.unshift(0);

  const unique: number[] = [];
  for (const p of pcts) {
    if (unique.length === 0 || Math.abs(unique[unique.length - 1]! - p) > 1e-6) {
      unique.push(p);
    }
  }
  return unique;
}

/** Index de secteur courant (0-based) selon LapDistPct iRacing. */
export function sectorIndexFromLapDistPct(
  lapDistPct: number,
  boundaries: number[],
): number {
  if (!Number.isFinite(lapDistPct) || lapDistPct < 0) return 0;
  const pct = lapDistPct > 1 ? lapDistPct % 1 : lapDistPct;
  const bounds =
    boundaries.length > 0 ? boundaries : [0];
  let idx = 0;
  for (let i = bounds.length - 1; i >= 0; i--) {
    if (pct + 1e-9 >= bounds[i]!) {
      idx = i;
      break;
    }
  }
  return Math.min(idx, bounds.length - 1);
}

/**
 * Instant exact (SessionTime) où LapDistPct a franchi une borne,
 * par interpolation linéaire entre deux trames.
 */
export function interpolateBoundaryCrossingTime(
  prevPct: number,
  prevTime: number,
  currPct: number,
  currTime: number,
  boundary: number,
): number {
  if (!Number.isFinite(prevTime) || !Number.isFinite(currTime)) return currTime;
  if (!Number.isFinite(prevPct) || !Number.isFinite(currPct)) return currTime;

  let a = prevPct;
  let b = currPct;
  let bound = boundary;

  // Franchissement SF : pct redescend près de 0.
  if (b + 0.25 < a) b += 1;
  if (bound + 1e-9 < a) bound += 1;

  const span = b - a;
  if (span <= 1e-9) return currTime;
  const u = (bound - a) / span;
  if (u <= 0) return prevTime;
  if (u >= 1) return currTime;
  return prevTime + (currTime - prevTime) * u;
}

/** Affichage iRacing : tronque au millième (pas d’arrondi). */
export function formatSectorTimeIracing(
  seconds: number | null | undefined,
): string {
  if (seconds == null || seconds < 0 || !Number.isFinite(seconds)) return "—";
  const ms = Math.floor(seconds * 1000 + 1e-6);
  return (ms / 1000).toFixed(3);
}
