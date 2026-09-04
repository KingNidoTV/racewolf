/**
 * Écart temps réel sur la piste (vs pilote).
 * Utilise CarIdxEstTime quand disponible, sinon LapDistPct × temps de référence.
 * Valeur positive = l’autre voiture est devant sur la piste.
 */
export function computeTrackGapSeconds(
  playerLapDist: number,
  otherLapDist: number,
  playerEst: number,
  otherEst: number,
  refLapSec: number,
): number {
  /**
   * EstTime = horodatage session à la position actuelle sur la piste.
   * Plus grand = plus avancé → écart positif si l’autre est devant.
   */
  if (playerEst > 0 && otherEst > 0) {
    return otherEst - playerEst;
  }

  const lap = Math.max(refLapSec, 45);
  let d = otherLapDist - playerLapDist;
  while (d > 0.5) d -= 1;
  while (d < -0.5) d += 1;
  return d * lap;
}

/** Affichage relatif : un seul chiffre après la virgule (+ devant, − derrière). */
export function formatRelativeTrackGap(gapSec: number): string {
  if (!Number.isFinite(gapSec) || Math.abs(gapSec) < 0.05) return "—";
  const v = Math.abs(gapSec).toFixed(1);
  return gapSec >= 0 ? `+${v}` : `-${v}`;
}
