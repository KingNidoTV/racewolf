import type { SessionData } from "@irsdk-node/types";
import { getSectorBoundaries } from "../../src/utils/sectorGeometry";

/** Nombre de secteurs officiels (SplitTimeInfo iRacing). */
export function getSectorCount(session: SessionData): number {
  const count = getSectorBoundaries(session).length;
  if (count >= 1) return count;
  const trackType = (session.WeekendInfo?.TrackType ?? "").toLowerCase();
  if (trackType.includes("oval")) return 2;
  return 3;
}
