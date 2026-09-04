import type { EnduranceLiveSession } from "../models/LiveSession";
import type { LiveTelemetryPatch } from "./LiveTelemetryProvider";

function isRaceSessionType(sessionType: string | null): boolean {
  if (!sessionType) return false;
  return /\brace\b/i.test(sessionType);
}

/** Complète le snapshot live avec la session préparation (même pont SDK). */
export function mapPrepSessionToLivePatch(
  prep: EnduranceLiveSession,
): LiveTelemetryPatch {
  return {
    session: {
      connected: prep.connected,
      iracingRunning: prep.iracingRunning,
      source: "sdk",
      sessionType: prep.sessionType,
      isRace: prep.connected ? isRaceSessionType(prep.sessionType) : false,
      trackName: prep.trackName,
      carName: prep.carName,
      error: prep.error,
      updatedAt: new Date().toISOString(),
    },
  };
}
