import { useCallback, useEffect, useState } from "react";
import type { EndurancePlan } from "../endurance/models";
import { createEnduranceStorage } from "../endurance/storage/enduranceStorage";

const storage = createEnduranceStorage();

/**
 * Charge le plan endurance (préparation) pour l'overlay course.
 * Se met à jour quand le plan est sauvegardé (IPC) ou périodiquement.
 */
export function useEnduranceOverlayPlan(pollMs = 2500) {
  const [plan, setPlan] = useState<EndurancePlan | null>(null);

  const refresh = useCallback(async () => {
    try {
      const loaded = await storage.load();
      setPlan(loaded);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const unsub = window.ath?.endurance?.onPlanUpdated?.(refresh);
    return () => unsub?.();
  }, [refresh]);

  useEffect(() => {
    if (pollMs <= 0) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, refresh]);

  return plan;
}
