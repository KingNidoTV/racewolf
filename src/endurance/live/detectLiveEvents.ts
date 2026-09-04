import type { LiveRecalcPayload } from "./liveEvents";
import type {
  LiveRaceSnapshot,
  LiveRecalcTrigger,
  LiveSessionFlag,
  LiveWeatherState,
} from "./models";

export interface DetectedLiveEvent {
  trigger: LiveRecalcTrigger;
  payload?: LiveRecalcPayload;
}

interface LiveEventDetectorState {
  flag: LiveSessionFlag;
  weather: LiveWeatherState;
  repairTimeLeftSec: number;
  repairWasActive: boolean;
}

const INITIAL: LiveEventDetectorState = {
  flag: "unknown",
  weather: "sec",
  repairTimeLeftSec: 0,
  repairWasActive: false,
};

/** Détecte réparation, safety car et changement météo depuis la télémétrie SDK. */
export function detectLiveRecalcEvents(
  prev: LiveRaceSnapshot,
  next: LiveRaceSnapshot,
  state: LiveEventDetectorState = INITIAL,
): { events: DetectedLiveEvent[]; state: LiveEventDetectorState } {
  const events: DetectedLiveEvent[] = [];
  const nextState: LiveEventDetectorState = {
    flag: next.session.flag,
    weather: next.session.weather,
    repairTimeLeftSec: next.session.repairTimeLeftSec,
    repairWasActive: state.repairWasActive,
  };

  if (
    prev.session.flag !== "safety_car" &&
    next.session.flag === "safety_car"
  ) {
    events.push({ trigger: "safety_car" });
  } else if (
    prev.session.flag !== "yellow" &&
    next.session.flag === "yellow" &&
    next.session.source === "sdk"
  ) {
    events.push({ trigger: "safety_car", payload: { retardSecondes: 120 } });
  }

  const repairActive = next.session.repairTimeLeftSec > 0;
  if (repairActive && !state.repairWasActive) {
    events.push({
      trigger: "repair",
      payload: {
        retardSecondes: Math.max(60, Math.ceil(next.session.repairTimeLeftSec)),
      },
    });
  }
  nextState.repairWasActive = repairActive;

  if (
    prev.session.weather !== next.session.weather &&
    next.session.source === "sdk"
  ) {
    events.push({
      trigger: "weather_change",
      payload: { weather: next.session.weather },
    });
  }

  return { events, state: nextState };
}

export function createLiveEventDetectorState(): LiveEventDetectorState {
  return { ...INITIAL };
}
