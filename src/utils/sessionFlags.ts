import type { DriverStatusIndicator } from "../types/telemetry";

/** Constantes irsdk_Flags (iRacing SDK / CarIdxSessionFlags). */
export const IRSDK_CHECKERED = 0x0000_0001;
export const IRSDK_WHITE = 0x0000_0002;
export const IRSDK_GREEN = 0x0000_0004;
export const IRSDK_YELLOW = 0x0000_0008;
export const IRSDK_RED = 0x0000_0010;
export const IRSDK_BLUE = 0x0000_0020;
export const IRSDK_DEBRIS = 0x0000_0040;
export const IRSDK_CROSSED = 0x0000_0080;
export const IRSDK_YELLOW_WAVING = 0x0000_0100;
export const IRSDK_ONE_LAP_TO_GREEN = 0x0000_0200;
export const IRSDK_GREEN_HELD = 0x0000_0400;
export const IRSDK_TEN_TO_GO = 0x0000_0800;
export const IRSDK_FIVE_TO_GO = 0x0000_1000;
export const IRSDK_RANDOM_WAVING = 0x0000_2000;
export const IRSDK_CAUTION = 0x0000_4000;
export const IRSDK_CAUTION_WAVING = 0x0000_8000;
export const IRSDK_BLACK = 0x0001_0000;
export const IRSDK_DISQUALIFY = 0x0002_0000;
export const IRSDK_SERVICIBLE = 0x0004_0000;
/** Drapeau noir plié — drive-through / stop-go / pénalité en cours. */
export const IRSDK_FURLED = 0x0008_0000;
export const IRSDK_REPAIR = 0x0010_0000;
export const IRSDK_DQ_SCORING_INVALID = 0x0020_0000;
export const IRSDK_START_HIDDEN = 0x1000_0000;
export const IRSDK_START_READY = 0x2000_0000;
export const IRSDK_START_SET = 0x4000_0000;
export const IRSDK_START_GO = 0x8000_0000;

export interface DriverFlags {
  inPits: boolean;
  hasPenalty: boolean;
  hasDamage: boolean;
}

export function resolveDriverFlags(
  sessionFlags: number,
  onPitRoad: boolean,
): DriverFlags {
  return {
    inPits: onPitRoad,
    hasPenalty: Boolean(
      sessionFlags & (IRSDK_BLACK | IRSDK_DISQUALIFY | IRSDK_FURLED),
    ),
    hasDamage: Boolean(sessionFlags & IRSDK_REPAIR),
  };
}

/** Classement pilote comme auparavant : pénalité/réparation/BOX uniquement. */
export function resolveDriverStatus(
  sessionFlags: number,
  onPitRoad: boolean,
): DriverStatusIndicator | null {
  const flags = resolveDriverFlags(sessionFlags, onPitRoad);
  if (flags.hasPenalty) return "penalty";
  if (flags.hasDamage) return "damage";
  if (flags.inPits) return "box";
  return null;
}
