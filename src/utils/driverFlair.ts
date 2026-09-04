/** Lit le FlairId pilote depuis la session YAML (casse / nom variable). */
export function extractDriverFlairId(
  driver: Record<string, unknown> | null | undefined,
): number {
  if (!driver) return 0;
  for (const key of [
    "FlairId",
    "FlairID",
    "flair_id",
    "flairId",
    "Flair",
  ]) {
    const raw = driver[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return 0;
}
