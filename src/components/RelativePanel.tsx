import { useMemo } from "react";
import type { RacingTelemetry, StandingsEntry } from "../types/telemetry";
import { pickRelativeEntries } from "../utils/relativeEntries";
import { StandingsList } from "./standings/StandingsList";

interface Props {
  entries: StandingsEntry[];
  standings: RacingTelemetry["standings"];
  ahead?: number;
  behind?: number;
}

function relativeGapSortValue(row: StandingsEntry): number {
  if (row.isPlayer) return 0;
  const gap = row.gap.trim();
  if (!gap || gap === "—") return 0;
  const match = gap.match(/^([+-])(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * Number.parseFloat(match[2]);
}

function filterRelativeWindow(
  entries: StandingsEntry[],
  ahead: number,
  behind: number,
): StandingsEntry[] {
  const sorted = [...entries].sort(
    (a, b) => relativeGapSortValue(b) - relativeGapSortValue(a),
  );
  const playerIdx = sorted.findIndex((e) => e.isPlayer);
  if (playerIdx < 0) return sorted;
  return sorted.slice(
    Math.max(0, playerIdx - ahead),
    Math.min(sorted.length, playerIdx + behind + 1),
  );
}

export function RelativePanel({
  entries,
  standings,
  ahead = 2,
  behind = 2,
}: Props) {
  const relative = useMemo(() => {
    const picked = pickRelativeEntries(
      {
        standings,
        relative: entries,
      } as RacingTelemetry,
      { ahead, behind },
    );
    const pending = picked.filter(
      (row) =>
        !row.isPlayer &&
        row.position <= 0 &&
        (!row.gap.trim() || row.gap.trim() === "—"),
    );
    const spatial = picked.filter((row) => !pending.includes(row));
    return [...filterRelativeWindow(spatial, ahead, behind), ...pending];
  }, [entries, standings, ahead, behind]);

  return (
    <div className="panel relative-panel">
      <div className="panel__title">Relatif</div>
      <StandingsList
        entries={relative}
        mode="relative"
        classRankSource={standings}
      />
    </div>
  );
}
