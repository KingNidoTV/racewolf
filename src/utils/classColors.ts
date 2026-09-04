import { parseLapTimeSec } from "./sessionFastestLap";

/** Entrée minimale pour classer les catégories par vitesse. */
export interface ClassRankable {
  classId?: number;
  classRelSpeed?: number;
  bestTime?: string;
}

/** Rang vitesse catégorie : 0 = plus rapide → rouge, puis bleu, vert, orange. */
export const CLASS_SPEED_COLORS = [
  {
    rank: 0,
    name: "red",
    accent: "#ef4444",
    bg: "rgba(239, 68, 68, 0.08)",
  },
  {
    rank: 1,
    name: "blue",
    accent: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.08)",
  },
  {
    rank: 2,
    name: "green",
    accent: "#22c55e",
    bg: "rgba(34, 197, 94, 0.08)",
  },
  {
    rank: 3,
    name: "orange",
    accent: "#f97316",
    bg: "rgba(249, 115, 22, 0.08)",
  },
] as const;

export type ClassSpeedColor = (typeof CLASS_SPEED_COLORS)[number];

export function isMultiClassField(entries: ClassRankable[]): boolean {
  const ids = new Set<number>();
  for (const entry of entries) {
    if (entry.classId != null && entry.classId >= 0) {
      ids.add(entry.classId);
      if (ids.size > 1) return true;
    }
  }
  return false;
}

/**
 * ClasseId → rang (0 = plus rapide).
 * Priorité : classRelSpeed (iRacing), sinon meilleur chrono de la classe.
 */
export function buildClassSpeedRankMap(
  entries: ClassRankable[],
): Map<number, number> {
  const stats = new Map<
    number,
    { relSpeed: number; bestLapSec: number; hasRel: boolean }
  >();

  for (const entry of entries) {
    const classId = entry.classId;
    if (classId == null || classId < 0) continue;

    const lapSec = entry.bestTime
      ? parseLapTimeSec(entry.bestTime)
      : null;
    const rel = entry.classRelSpeed;
    const hasRel = typeof rel === "number" && Number.isFinite(rel) && rel !== 0;
    const prev = stats.get(classId);

    if (!prev) {
      stats.set(classId, {
        relSpeed: hasRel ? (rel as number) : 0,
        bestLapSec: lapSec ?? Number.POSITIVE_INFINITY,
        hasRel,
      });
      continue;
    }

    if (hasRel) {
      prev.hasRel = true;
      prev.relSpeed = Math.max(prev.relSpeed, rel as number);
    }
    if (lapSec != null && lapSec < prev.bestLapSec) {
      prev.bestLapSec = lapSec;
    }
  }

  const ranked = [...stats.entries()].sort((a, b) => {
    const [, sa] = a;
    const [, sb] = b;
    if (sa.hasRel || sb.hasRel) {
      return sb.relSpeed - sa.relSpeed;
    }
    return sa.bestLapSec - sb.bestLapSec;
  });

  const map = new Map<number, number>();
  ranked.forEach(([classId], index) => {
    map.set(classId, index);
  });
  return map;
}

export function classColorForRank(rank: number | undefined): ClassSpeedColor | null {
  if (rank == null || rank < 0) return null;
  return CLASS_SPEED_COLORS[Math.min(rank, CLASS_SPEED_COLORS.length - 1)] ?? null;
}

export function classColorForEntry(
  entry: ClassRankable,
  rankByClass: Map<number, number>,
): ClassSpeedColor | null {
  if (entry.classId == null) return null;
  return classColorForRank(rankByClass.get(entry.classId));
}
