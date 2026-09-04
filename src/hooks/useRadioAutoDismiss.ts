import { useEffect, useRef } from "react";
import type { TrackMapData } from "../types/telemetry";
import { sectorIndexFromLapDistPct } from "../utils/sectorGeometry";

function normalizeSectorStarts(
  starts: number[] | undefined,
  sectorCount: number,
): number[] {
  const count = Math.max(1, sectorCount || 3);
  if (starts && starts.length >= 1) {
    const pcts = starts.map((p) => {
      const n = Number(p);
      if (!Number.isFinite(n)) return 0;
      return ((n % 1) + 1) % 1;
    });
    const unique: number[] = [];
    for (const p of pcts) {
      if (
        unique.length === 0 ||
        Math.abs(unique[unique.length - 1]! - p) > 1e-6
      ) {
        unique.push(p);
      }
    }
    if (unique.length > 0) return unique;
  }
  return Array.from({ length: count }, (_, i) => i / count);
}

/** Index du secteur courant (0-based) selon LapDistPct iRacing. */
export function sectorIndexFromPct(
  lapDistPct: number,
  sectorStarts: number[],
): number {
  return sectorIndexFromLapDistPct(lapDistPct, sectorStarts);
}

/**
 * Efface la radio après 2 passages de secteurs depuis son activation.
 * Utilise SplitTimeInfo + LapDistPct bruts (même logique que le jeu / chronos).
 */
export function useRadioAutoDismiss(
  active: boolean,
  trackMap: TrackMapData | null | undefined,
  sectorCount: number,
  onDismiss: () => void,
): void {
  const lastSectorRef = useRef<number | null>(null);
  const passedRef = useRef(0);
  const wasActiveRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) {
      wasActiveRef.current = false;
      lastSectorRef.current = null;
      passedRef.current = 0;
      return;
    }

    const gamePct = trackMap?.playerLapDistPctGame;
    const player = trackMap?.cars.find((c) => c.isPlayer);
    const pct =
      gamePct != null && gamePct >= 0
        ? gamePct
        : (player?.lapDistPct ?? -1);
    if (pct < 0) return;

    const starts = normalizeSectorStarts(
      trackMap?.sectorStartPctsGame ?? trackMap?.sectorStartPcts,
      sectorCount,
    );
    const idx = sectorIndexFromPct(pct, starts);

    if (!wasActiveRef.current) {
      wasActiveRef.current = true;
      lastSectorRef.current = idx;
      passedRef.current = 0;
      return;
    }

    if (lastSectorRef.current != null && idx !== lastSectorRef.current) {
      passedRef.current += 1;
      lastSectorRef.current = idx;
      if (passedRef.current >= 2) {
        onDismissRef.current();
      }
    }
  }, [active, trackMap, sectorCount]);
}
