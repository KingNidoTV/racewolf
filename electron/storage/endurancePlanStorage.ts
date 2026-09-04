import { app } from "electron";
import fs from "fs/promises";
import path from "path";
import type { EndurancePlan } from "../../src/endurance/models";
import { migrateEndurancePlan } from "../../src/endurance/models/migratePlan";

const FILE_NAME = "endurance-plan.json";

function planPath(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

export async function loadEndurancePlan(): Promise<EndurancePlan | null> {
  try {
    const raw = await fs.readFile(planPath(), "utf-8");
    return migrateEndurancePlan(JSON.parse(raw) as EndurancePlan);
  } catch {
    return null;
  }
}

export async function saveEndurancePlan(plan: EndurancePlan): Promise<void> {
  const file = planPath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(plan, null, 2), "utf-8");
}
