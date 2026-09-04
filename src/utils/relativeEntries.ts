import type { RacingTelemetry, StandingsEntry } from "../types/telemetry";
import { buildRelativeStandingsList } from "./filterStandings";

/** Entrées relatif avec écarts piste (1 décimale), pas écart au leader. */
export function pickRelativeEntries(
  racing: RacingTelemetry,
  options?: { ahead?: number; behind?: number },
): StandingsEntry[] {
  const onTrack = (row: StandingsEntry) =>
    Boolean(row.isPlayer) ||
    (!row.inPits && row.status !== "box" && row.isConnected !== false);

  if (racing.relative.length > 0) {
    return racing.relative.filter(onTrack);
  }

  const fromStandings = buildRelativeStandingsList(racing.standings, options)
    .filter((item) => item.kind === "row")
    .map((item) => item.row)
    .filter(onTrack);

  return fromStandings;
}
