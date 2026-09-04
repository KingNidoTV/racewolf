import type { SectorStatus } from "../types/telemetry";

const EPS = 0.008;
const GREEN_WINDOW_SEC = 0.12;

function sectorStatuses(
  sectorSecs: number[],
  sessionBestSecs: number[],
  mode: "garage" | "standings",
): SectorStatus[] {
  const len = Math.max(sectorSecs.length, sessionBestSecs.length);
  const out: SectorStatus[] = [];

  for (let i = 0; i < len; i++) {
    const t = sectorSecs[i] ?? -1;
    if (t < 0) {
      out.push("slower");
      continue;
    }
    const session = sessionBestSecs[i] ?? -1;
    if (session > 0 && t <= session + EPS) {
      out.push("record");
    } else if (
      mode === "standings" &&
      session > 0 &&
      t - session <= GREEN_WINDOW_SEC
    ) {
      out.push("personal");
    } else if (mode === "garage") {
      out.push("personal");
    } else {
      out.push("slower");
    }
  }

  return out;
}

/** Couleur secteurs garage : vert par défaut, violet si égal au meilleur session. */
export function garageSectorStatuses(
  sectorSecs: number[],
  sessionBestSecs: number[],
): SectorStatus[] {
  return sectorStatuses(sectorSecs, sessionBestSecs, "garage");
}

/** Barres secteur P/Q : violet = record session, vert = proche, jaune = plus lent. */
export function standingsSectorBarStatuses(
  sectorSecs: number[],
  sessionBestSecs: number[],
): SectorStatus[] {
  return sectorStatuses(sectorSecs, sessionBestSecs, "standings");
}
