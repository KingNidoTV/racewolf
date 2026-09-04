/** Numéro de session iRacing courant (Practice / Qualif / Race…). */
export function readSessionNum(telemetry: Record<string, unknown>): number {
  const n = Number(telemetry.SessionNum);
  return Number.isFinite(n) ? n : -1;
}

export function readLapCompleted(telemetry: Record<string, unknown>): number {
  const n = Number(telemetry.LapCompleted);
  return Number.isFinite(n) ? n : -1;
}
