import type { SessionData } from "@irsdk-node/types";
import { SessionState } from "@irsdk-node/types";
import {
  isPlayerAtSessionPits,
  readPlayerRaceContext,
} from "./playerRaceContext";

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function telemetryBool(
  telemetry: Record<string, unknown>,
  key: string,
  playerIdx = 0,
): boolean {
  const raw = telemetry[key];
  if (Array.isArray(raw)) return Boolean(raw[playerIdx]);
  return Boolean(raw);
}

/** Replay chargé depuis un fichier (.rpy) — WeekendInfo:SimMode. */
export function isReplayFileSession(
  session: SessionData | null | undefined,
): boolean {
  const mode = session?.WeekendInfo?.SimMode?.trim().toLowerCase();
  return mode === "replay";
}

/** Lecture replay en cours (session live ou fichier). */
export function isReplayPlaybackScreen(
  telemetry: Record<string, unknown>,
): boolean {
  return telemetryBool(telemetry, "IsReplayPlaying");
}

/** Écran / mode replay → overlay garage ATH. */
export function isReplayGarageScreen(
  telemetry: Record<string, unknown>,
  session?: SessionData | null,
): boolean {
  return isReplayFileSession(session) || isReplayPlaybackScreen(telemetry);
}

/** Écran garage iRacing (bouton garage / setup). */
export function isSetupGarageScreen(
  telemetry: Record<string, unknown>,
): boolean {
  return telemetryBool(telemetry, "IsGarageVisible");
}

export function isOnTrackTelemetry(
  telemetry: Record<string, unknown>,
): boolean {
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  return (
    telemetryBool(telemetry, "IsOnTrackCar", playerIdx) ||
    telemetryBool(telemetry, "IsOnTrack", playerIdx)
  );
}

function sessionState(telemetry: Record<string, unknown>): number {
  return num(telemetry.SessionState, SessionState.Invalid);
}

function playerSpeedKmh(telemetry: Record<string, unknown>): number {
  const playerIdx = num(telemetry.PlayerCarIdx, 0);
  const raw = telemetry.Speed;
  const speedMs = Array.isArray(raw)
    ? num(raw[playerIdx], 0)
    : num(raw, 0);
  return speedMs * 3.6;
}

/** Voiture en mouvement sur piste avant le drapeau vert (warmup, parade, sortie stands). */
export function isDrivingOnTrack(
  telemetry: Record<string, unknown>,
): boolean {
  if (!isOnTrackTelemetry(telemetry)) return false;

  const state = sessionState(telemetry);
  if (state === SessionState.ParadeLaps) return true;

  if (state >= SessionState.Racing) return false;

  if (playerSpeedKmh(telemetry) > 8) return true;
  return num(telemetry.Lap, 0) > 0;
}

/** Course en cours (vert / damier / cool down), pas l’attente grille ou warmup. */
export function isActiveRacingSession(
  telemetry: Record<string, unknown>,
): boolean {
  const state = sessionState(telemetry);
  return state >= SessionState.Racing;
}

/**
 * Écran d’attente avant de rouler (grille / stands / warmup / parade),
 * même si la voiture est déjà « on track » côté SDK.
 */
export function isPreTrackWaitingScreen(
  telemetry: Record<string, unknown>,
): boolean {
  if (isSetupGarageScreen(telemetry)) return false;

  const state = sessionState(telemetry);

  if (state >= SessionState.GetInCar && state < SessionState.Racing) {
    return true;
  }

  const ctx = readPlayerRaceContext(telemetry);
  if (isPlayerAtSessionPits(ctx) && state < SessionState.Racing) {
    return true;
  }

  return false;
}
