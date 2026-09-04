import type { LiveFuel } from "./LiveFuel";
import { DEFAULT_LIVE_FUEL } from "./LiveFuel";
import type { LiveSession } from "./LiveSession";
import { DEFAULT_LIVE_SESSION } from "./LiveSession";
import type { LiveStint } from "./LiveStint";
import { DEFAULT_LIVE_STINT } from "./LiveStint";
import type { LiveStrategy } from "./LiveStrategy";
import { DEFAULT_LIVE_STRATEGY } from "./LiveStrategy";

/** Instantané complet du mode live (agrégation des 4 domaines). */
export interface LiveRaceSnapshot {
  session: LiveSession;
  stint: LiveStint;
  fuel: LiveFuel;
  strategy: LiveStrategy;
}

export const DEFAULT_LIVE_RACE_SNAPSHOT: LiveRaceSnapshot = {
  session: { ...DEFAULT_LIVE_SESSION },
  stint: { ...DEFAULT_LIVE_STINT },
  fuel: { ...DEFAULT_LIVE_FUEL },
  strategy: { ...DEFAULT_LIVE_STRATEGY },
};
