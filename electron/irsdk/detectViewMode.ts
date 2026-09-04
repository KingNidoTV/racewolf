import type { SessionData } from "@irsdk-node/types";
import type { OverlayViewMode } from "../../src/types/ipc";
import {
  isActiveRacingSession,
  isDrivingOnTrack,
  isOnTrackTelemetry,
  isPreTrackWaitingScreen,
  isReplayGarageScreen,
  isSetupGarageScreen,
} from "./viewModeSignals";

export function detectViewMode(
  telemetry: Record<string, unknown>,
  connected: boolean,
  session?: SessionData | null,
): OverlayViewMode {
  if (!connected) return "hidden";

  if (isReplayGarageScreen(telemetry, session)) return "garage";

  // Écran setup / garage iRacing → overlay garage (même depuis la grille).
  if (isSetupGarageScreen(telemetry)) return "garage";

  // Sur la piste (y compris attente grille / warmup immobile) → overlay course.
  if (isOnTrackTelemetry(telemetry)) return "racing";

  // Pas encore en piste : stands / get-in-car / menus pré-course → garage.
  if (isPreTrackWaitingScreen(telemetry)) return "garage";

  if (isActiveRacingSession(telemetry) || isDrivingOnTrack(telemetry)) {
    return "racing";
  }

  return "hidden";
}
