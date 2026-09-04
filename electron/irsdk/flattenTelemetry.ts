import type { TelemetryVarList } from "@irsdk-node/types";

/**
 * irsdk-node v4 expose chaque variable sous `{ value: T[] }`.
 * On produit un objet plat compatible avec mapTelemetry (scalaires ou tableaux).
 */
export function flattenTelemetry(
  telemetry: TelemetryVarList,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, variable] of Object.entries(telemetry)) {
    if (variable == null || typeof variable !== "object") continue;
    if (!("value" in variable)) continue;

    const raw = variable.value;
    if (Array.isArray(raw)) {
      out[key] = raw.length === 1 ? raw[0] : [...raw];
    } else {
      out[key] = raw;
    }
  }

  return out;
}
