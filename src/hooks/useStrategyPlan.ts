import { useCallback, useEffect, useMemo, useState } from "react";
import type { StrategyLive, StrategyPlan, StrategySessionInfo } from "../types/strategy";
import {
  createDefaultPlan,
  generateStintRows,
  updatePlanDrivers,
  updateStintDriver,
} from "../utils/strategyPlan";
import {
  applyLiveToPlan,
  loadStrategyPlan,
  saveStrategyPlan,
} from "../utils/strategyPlanStorage";

export function useStrategyPlan(
  sessionFromSdk: StrategySessionInfo,
  live: StrategyLive,
) {
  const [plan, setPlan] = useState<StrategyPlan>(() => loadStrategyPlan());

  useEffect(() => {
    setPlan((prev) => {
      const session = { ...prev.session, ...sessionFromSdk };
      const pitChanged = prev.session.pitTime !== sessionFromSdk.pitTime;
      const next = {
        ...prev,
        session,
        stints: pitChanged
          ? generateStintRows({ ...prev, session }, live.avgLapSec)
          : prev.stints,
      };
      if (pitChanged) saveStrategyPlan(next);
      return next;
    });
  }, [
    sessionFromSdk.date,
    sessionFromSdk.startTime,
    sessionFromSdk.duration,
    sessionFromSdk.car,
    sessionFromSdk.track,
    sessionFromSdk.pitTime,
    live.avgLapSec,
  ]);

  const displayPlan = useMemo(
    () => applyLiveToPlan(plan, live),
    [plan, live],
  );

  const setDrivers = useCallback(
    (drivers: StrategyPlan["drivers"]) => {
      setPlan((prev) => {
        const next = updatePlanDrivers(prev, drivers, live.avgLapSec);
        saveStrategyPlan(next);
        return next;
      });
    },
    [live.avgLapSec],
  );

  const setDriverCount = useCallback(
    (count: number) => {
      const n = Math.min(8, Math.max(1, count));
      setPlan((prev) => {
        const drivers = Array.from({ length: n }, (_, i) => {
          const existing = prev.drivers[i];
          return (
            existing ?? {
              id: `d${i + 1}`,
              name: `Pilote ${i + 1}`,
              color: ["#22c55e", "#3b82f6", "#a855f7", "#ef4444"][i % 4],
              lapsPerStint: 21,
            }
          );
        });
        const next = updatePlanDrivers(prev, drivers, live.avgLapSec);
        saveStrategyPlan(next);
        return next;
      });
    },
    [live.avgLapSec],
  );

  const assignStintDriver = useCallback((stintIndex: number, driverId: string) => {
    setPlan((prev) => {
      const next = updateStintDriver(prev, stintIndex, driverId);
      saveStrategyPlan(next);
      return next;
    });
  }, []);

  const regenerateStints = useCallback(() => {
    setPlan((prev) => {
      const next = {
        ...prev,
        stints: generateStintRows(prev, live.avgLapSec),
      };
      saveStrategyPlan(next);
      return next;
    });
  }, [live.avgLapSec]);

  const setRemarks = useCallback((remarks: string) => {
    setPlan((prev) => {
      const next = { ...prev, remarks };
      saveStrategyPlan(next);
      return next;
    });
  }, []);

  const resetPlan = useCallback((driverCount = 4) => {
    const next = createDefaultPlan(driverCount);
    next.stints = generateStintRows(next, live.avgLapSec);
    saveStrategyPlan(next);
    setPlan(next);
  }, [live.avgLapSec]);

  return {
    plan: displayPlan,
    rawPlan: plan,
    setDrivers,
    setDriverCount,
    assignStintDriver,
    regenerateStints,
    setRemarks,
    resetPlan,
  };
}
