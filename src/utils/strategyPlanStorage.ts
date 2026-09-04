import type { StrategyPlan } from "../types/strategy";
import { createDefaultPlan, generateStintRows } from "./strategyPlan";

export {
  applyLiveToPlan,
  createDefaultPlan,
  generateStintRows,
  updatePlanDrivers,
  updateStintDriver,
} from "./strategyPlan";

const STORAGE_KEY = "ath-strategy-plan";

export function loadStrategyPlan(): StrategyPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const plan = createDefaultPlan(4);
      plan.stints = generateStintRows(plan, 124);
      return plan;
    }
    const parsed = JSON.parse(raw) as StrategyPlan;
    if (parsed?.drivers?.length && parsed.session) {
      if (!parsed.stints?.length) {
        parsed.stints = generateStintRows(parsed, 124);
      }
      return parsed;
    }
  } catch {
    /* ignore */
  }
  const plan = createDefaultPlan(4);
  plan.stints = generateStintRows(plan, 124);
  return plan;
}

export function saveStrategyPlan(plan: StrategyPlan): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}
