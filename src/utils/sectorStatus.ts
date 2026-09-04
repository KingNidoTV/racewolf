import type { SectorStatus } from "../types/telemetry";

const EPS = 0.008;

/** Violet = record session, vert = meilleure perso (pas record), jaune = plus lent. */
export function classifySectorSplit(
  split: number,
  personalBest: number,
  sessionBest: number,
): SectorStatus {
  if (split < 0) return "slower";
  if (sessionBest > 0 && split <= sessionBest + EPS) return "record";
  if (personalBest > 0 && split <= personalBest + EPS) return "personal";
  return "slower";
}

/**
 * Déduit la couleur secteur du dernier tour.
 * Violet (record) prioritaire, puis vert (meilleure perso), sinon jaune.
 */
export function deriveSectorStatuses(
  lastSecs: number[],
  personalBestSecs: number[],
  sessionBestSecs?: number[],
): SectorStatus[] {
  const count = Math.max(
    lastSecs.length,
    personalBestSecs.length,
    sessionBestSecs?.length ?? 0,
    1,
  );
  const out: SectorStatus[] = [];

  for (let i = 0; i < count; i++) {
    const last = lastSecs[i] ?? -1;
    if (last < 0) {
      out.push("slower");
      continue;
    }

    out.push(
      classifySectorSplit(
        last,
        personalBestSecs[i] ?? -1,
        sessionBestSecs?.[i] ?? -1,
      ),
    );
  }

  return out;
}
