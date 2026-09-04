import { useEffect, useState } from "react";
import type { EndurancePlan } from "../models";
import type { LiveRaceSnapshot } from "../live/models";
import { DEFAULT_LIVE_RACE_SNAPSHOT } from "../live/models";
import { liveTelemetryHub } from "../live/LiveTelemetryHub";
import type { LiveRecalcPayload } from "../live/liveEvents";
import type { LiveRecalcTrigger } from "../live/models";

/** Abonnement au hub télémétrie live (mode course). */
export function useLiveRace(plan: EndurancePlan | null, active: boolean) {
  const [snapshot, setSnapshot] = useState<LiveRaceSnapshot>(
    DEFAULT_LIVE_RACE_SNAPSHOT,
  );

  useEffect(() => {
    liveTelemetryHub.setPlan(plan);
  }, [plan]);

  useEffect(() => {
    if (!active || !plan?.strategyValidatedAt) {
      liveTelemetryHub.stop();
      return;
    }

    liveTelemetryHub.setPlan(plan);
    liveTelemetryHub.restart();
    const unsub = liveTelemetryHub.subscribe(setSnapshot);
    return () => {
      unsub();
      liveTelemetryHub.stop();
    };
    // Le plan est mis à jour séparément ci-dessus. Ne pas redémarrer le hub à
    // chaque mesure pit/carburant : cela coupait le flux Live en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, plan?.strategyValidatedAt]);

  const triggerRecalc = (
    trigger: LiveRecalcTrigger,
    payload?: LiveRecalcPayload,
  ) => {
    liveTelemetryHub.triggerRecalc(trigger, payload);
  };

  return { snapshot, triggerRecalc };
}
