import type { TrackMapCar, TrackMapData } from "../types/telemetry";

export const VIEW = 220;
export const CX = VIEW / 2;
export const CY = VIEW / 2;
/** Rayon de la piste (anneau). */
export const RING_R = 78;
export const RING_STROKE = 14;
/** Rayon des libellés (n° voiture). */
export const LABEL_R = RING_R + 18;
/** Longueur des ticks radiaux (demi). */
export const TICK_HALF = RING_STROKE / 2 + 2;

/** @deprecated Conservé pour loadLayout / trackLayouts. */
export const DEFAULT_CENTERLINE = `M ${CX}, ${CY + RING_R} A ${RING_R}, ${RING_R} 0 1, 1 ${CX - 0.01}, ${CY + RING_R}`;
export const RADIUS = RING_R;
export const TRACK_WIDTH = RING_STROKE;
export const TRACK_EDGE = RING_STROKE + 3;

export interface PolarPoint {
  x: number;
  y: number;
  /** Angle SVG rotate (degrés), 0 = droite. */
  angleDeg: number;
}

export interface PathSample {
  x: number;
  y: number;
  angleDeg: number;
}

/**
 * 0% = sommet (S/F), sens horaire.
 * Aligné sur le style radar / relative circle.
 */
export function pctToPolar(
  lapDistPct: number,
  radius: number,
  cx = CX,
  cy = CY,
): PolarPoint {
  const t = ((lapDistPct % 1) + 1) % 1;
  const rad = -Math.PI / 2 + t * Math.PI * 2;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
    angleDeg: (rad * 180) / Math.PI,
  };
}

export function samplePath(
  _path: SVGPathElement,
  lapDistPct: number,
): PathSample | null {
  return pctToPolar(lapDistPct, RING_R);
}

export function defaultSectorPcts(count: number): number[] {
  const n = Math.max(1, Math.min(12, Math.round(count) || 3));
  return Array.from({ length: n }, (_, i) => i / n);
}

export type { TrackMapCar, TrackMapData };
