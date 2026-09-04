import type { StandingsEntry } from "../types/telemetry";

const LAP_TIME_RE = /^(\d+):(\d+(?:\.\d+)?)$/;

export function parseLapTimeSec(label: string): number | null {
  if (!label || label === "—") return null;
  const match = label.match(LAP_TIME_RE);
  if (!match) return null;
  const sec = Number(match[1]) * 60 + Number(match[2]);
  return Number.isFinite(sec) ? sec : null;
}

/** Marque le ou les pilotes au meilleur tour de session. */
export function markSessionFastestLap<T extends Pick<StandingsEntry, "bestTime">>(
  entries: T[],
): (T & { isSessionFastest?: boolean })[] {
  let sessionBest = Infinity;
  for (const entry of entries) {
    const sec = parseLapTimeSec(entry.bestTime);
    if (sec != null && sec < sessionBest) {
      sessionBest = sec;
    }
  }

  if (!Number.isFinite(sessionBest)) {
    return entries.map((entry) => ({ ...entry, isSessionFastest: false }));
  }

  const epsilon = 0.0005;
  return entries.map((entry) => {
    const sec = parseLapTimeSec(entry.bestTime);
    return {
      ...entry,
      isSessionFastest:
        sec != null && Math.abs(sec - sessionBest) < epsilon,
    };
  });
}
