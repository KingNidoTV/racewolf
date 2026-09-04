import type { TrackMapData } from "../types/telemetry";
import {
  LABEL_R,
  RING_R,
  defaultSectorPcts,
  pctToPolar,
  type PolarPoint,
} from "./geometry";

export interface PlacedCar {
  carIdx: number;
  carNumber: string;
  carColor: string;
  isPlayer?: boolean;
  onPit?: boolean;
  isClassLeader?: boolean;
  position: number;
  classId?: number;
  classRelSpeed?: number;
  ring: PolarPoint;
  label: PolarPoint;
}

export interface PlacedMarker {
  ring: PolarPoint;
  pct: number;
}

export interface TrackMapScene {
  cars: PlacedCar[];
  sectors: PlacedMarker[];
  startFinish: PlacedMarker | null;
  pitGhost: PlacedMarker | null;
}

export function buildCircleScene(map: TrackMapData): TrackMapScene {
  const cars: PlacedCar[] = map.cars
    .map((car) => {
      const ring = pctToPolar(car.lapDistPct, RING_R);
      const label = pctToPolar(car.lapDistPct, LABEL_R);
      return {
        carIdx: car.carIdx,
        carNumber: car.carNumber,
        carColor: car.carColor,
        isPlayer: car.isPlayer,
        onPit: car.onPit,
        isClassLeader: car.isClassLeader,
        position: car.position,
        classId: car.classId,
        classRelSpeed: car.classRelSpeed,
        ring,
        label,
      };
    })
    .sort((a, b) => {
      if (a.isPlayer) return 1;
      if (b.isPlayer) return -1;
      return a.position - b.position;
    });

  const rawSectors =
    map.sectorStartPcts && map.sectorStartPcts.length > 0
      ? map.sectorStartPcts
      : defaultSectorPcts(3);

  const sectors = rawSectors.map((pct) => ({
    pct,
    ring: pctToPolar(pct, RING_R),
  }));

  const sfPct = map.startFinishPct ?? 0;
  const startFinish = {
    pct: sfPct,
    ring: pctToPolar(sfPct, RING_R),
  };

  const pitGhost =
    map.pitGhost?.active && map.pitGhost.lapDistPct >= 0
      ? {
          pct: map.pitGhost.lapDistPct,
          ring: pctToPolar(map.pitGhost.lapDistPct, RING_R),
        }
      : null;

  return { cars, sectors, startFinish, pitGhost };
}
