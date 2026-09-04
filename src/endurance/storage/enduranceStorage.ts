import type { EndurancePlan } from "../models";
import { createDefaultPlan, migrateEndurancePlan } from "../models";

export interface EnduranceStorage {
  load(): Promise<EndurancePlan>;
  save(plan: EndurancePlan): Promise<void>;
}

const STORAGE_KEY = "endurance-plan-v1";

function readLocalStorage(): EndurancePlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EndurancePlan;
  } catch {
    return null;
  }
}

function writeLocalStorage(plan: EndurancePlan): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan, null, 2));
}

export function createEnduranceStorage(): EnduranceStorage {
  if (typeof window !== "undefined" && window.ath?.endurance) {
    return {
      load: () => window.ath!.endurance!.load(),
      save: (plan) => window.ath!.endurance!.save(plan),
    };
  }

  return {
    async load() {
      const raw = readLocalStorage();
      if (!raw) return createDefaultPlan();
      return migrateEndurancePlan(raw);
    },
    async save(plan) {
      writeLocalStorage(plan);
    },
  };
}
