type Telemetry = Record<string, unknown>;

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Lit un secteur pilote en essayant les noms de variables iRacing connus. */
export function readPlayerSectorSec(
  telemetry: Telemetry,
  sectorIndex: number,
  mode: "last" | "best" | "current" = "last",
): number {
  const n = sectorIndex + 1;
  const groups: Record<typeof mode, string[]> = {
    last: [
      `LapLastLapTimeSector${n}`,
      `LapLastNLapSector${n}`,
      `LapLastLapSector${n}`,
      `LapLastSector${n}`,
      `LastSectorTime${n}`,
    ],
    best: [
      `LapBestLapTimeSector${n}`,
      `LapBestNLapSector${n}`,
      `LapBestLapSector${n}`,
      `BestSectorTime${n}`,
    ],
    current: [
      `LapCurrentSectorTime${n}`,
      `LapCurrentLapTimeSector${n}`,
      `LapCurrentSector${n}`,
      `CurrentSectorTime${n}`,
    ],
  };

  for (const key of groups[mode]) {
    const v = num(telemetry[key], -1);
    if (v >= 0 && v < 600) return v;
  }
  return -1;
}

export function readLastLapSectorSecs(
  telemetry: Telemetry,
  sectorCount: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < sectorCount; i++) {
    let v = readPlayerSectorSec(telemetry, i, "last");
    if (v < 0) v = readPlayerSectorSec(telemetry, i, "current");
    out.push(v);
  }
  return out;
}

export function readBestLapSectorSecs(
  telemetry: Telemetry,
  sectorCount: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < sectorCount; i++) {
    out.push(readPlayerSectorSec(telemetry, i, "best"));
  }
  return out;
}

export function readCurrentLapSectorSecs(
  telemetry: Telemetry,
  sectorCount: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < sectorCount; i++) {
    out.push(readPlayerSectorSec(telemetry, i, "current"));
  }
  return out;
}
