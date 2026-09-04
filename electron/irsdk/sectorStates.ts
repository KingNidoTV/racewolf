import type { SectorStatus } from "../../src/types/telemetry";
import { deriveSectorStatuses } from "../../src/utils/sectorStatus";
import {
  readBestLapSectorSecs,
  readLastLapSectorSecs,
} from "./sectorTelemetry";

type Telemetry = Record<string, unknown>;

export function computeSectorStatuses(
  telemetry: Telemetry,
  sectorCount = 3,
  trackedLast?: number[],
): SectorStatus[] {
  const count = Math.max(1, sectorCount);
  const sdkLast = readLastLapSectorSecs(telemetry, count);
  const last = Array.from({ length: count }, (_, i) => {
    if (sdkLast[i] >= 0) return sdkLast[i];
    const t = trackedLast?.[i] ?? -1;
    return t >= 0 ? t : -1;
  });
  const personal = readBestLapSectorSecs(telemetry, count);
  const session = readBestLapSectorSecs(telemetry, count);

  return deriveSectorStatuses(last, personal, session);
}
