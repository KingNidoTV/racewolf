import { useMemo } from "react";
import { buildCircleScene } from "./buildScene";
import {
  CX,
  CY,
  RING_R,
  RING_STROKE,
  TICK_HALF,
  VIEW,
} from "./geometry";
import type { TrackMapData } from "./types";
import type { PlacedCar, PlacedMarker } from "./buildScene";
import {
  buildClassSpeedRankMap,
  classColorForEntry,
  isMultiClassField,
} from "../utils/classColors";

interface Props {
  map: TrackMapData;
  lap?: number | null;
  timeLabel?: string | null;
}

function SectorRay({ m, emphasize }: { m: PlacedMarker; emphasize?: boolean }) {
  const dx = m.ring.x - CX;
  const dy = m.ring.y - CY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const inner = RING_R - RING_STROKE / 2 - 6;
  const outer = RING_R + RING_STROKE / 2 + 8;
  return (
    <line
      x1={CX + ux * inner}
      y1={CY + uy * inner}
      x2={CX + ux * outer}
      y2={CY + uy * outer}
      className={
        emphasize ? "trackmap__sector trackmap__sector--sf" : "trackmap__sector"
      }
    />
  );
}

function PitGhost({ m }: { m: PlacedMarker }) {
  return (
    <g transform={`translate(${m.ring.x}, ${m.ring.y})`} className="trackmap__pit">
      <circle r={7} className="trackmap__pit-ring" />
      <circle r={4.5} className="trackmap__pit-fill" />
      <text y={0.5} className="trackmap__pit-label">
        P
      </text>
    </g>
  );
}

function LeaderCrown({ x, y }: { x: number; y: number }) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="trackmap__crown"
      aria-hidden
    >
      <path
        d="M-4.5 2.2 L-3.2 -2.4 L-1.1 0.6 L0 -3.2 L1.1 0.6 L3.2 -2.4 L4.5 2.2 Z"
        className="trackmap__crown-path"
      />
    </g>
  );
}

function CarMark({
  car,
  numberColor,
}: {
  car: PlacedCar;
  numberColor?: string | null;
}) {
  const numStyle = numberColor
    ? { fill: numberColor }
    : undefined;

  const crownY = car.label.y - 9;

  if (car.isPlayer) {
    return (
      <g className="trackmap__car trackmap__car--player">
        <circle
          cx={car.ring.x}
          cy={car.ring.y}
          r={6.5}
          className="trackmap__player-dot"
        />
        {car.isClassLeader ? (
          <LeaderCrown x={car.label.x} y={crownY} />
        ) : null}
        <text
          x={car.label.x}
          y={car.label.y}
          className="trackmap__car-num trackmap__car-num--player"
          style={numStyle}
        >
          {car.carNumber}
        </text>
      </g>
    );
  }

  const dx = car.ring.x - CX;
  const dy = car.ring.y - CY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;

  return (
    <g
      className={[
        "trackmap__car",
        car.onPit ? "trackmap__car--pit" : null,
        car.isClassLeader ? "trackmap__car--leader" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <line
        x1={car.ring.x - ux * TICK_HALF}
        y1={car.ring.y - uy * TICK_HALF}
        x2={car.ring.x + ux * TICK_HALF}
        y2={car.ring.y + uy * TICK_HALF}
        className="trackmap__car-tick"
        style={{ stroke: car.onPit ? undefined : car.carColor }}
      />
      {car.isClassLeader ? (
        <LeaderCrown x={car.label.x} y={crownY} />
      ) : null}
      <text
        x={car.label.x}
        y={car.label.y}
        className="trackmap__car-num"
        style={numStyle}
      >
        {car.carNumber}
      </text>
    </g>
  );
}

export function TrackMap({ map, lap = null, timeLabel = null }: Props) {
  const scene = useMemo(() => buildCircleScene(map), [map]);

  const classNumberColors = useMemo(() => {
    if (!isMultiClassField(map.cars)) return null;
    const ranks = buildClassSpeedRankMap(map.cars);
    const byIdx = new Map<number, string>();
    for (const car of map.cars) {
      const color = classColorForEntry(car, ranks);
      if (color) byIdx.set(car.carIdx, color.accent);
    }
    return byIdx;
  }, [map.cars]);

  return (
    <div className="trackmap" title={map.trackName}>
      <svg
        className="trackmap__svg"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={`Carte ${map.trackName}`}
      >
        <circle
          cx={CX}
          cy={CY}
          r={RING_R}
          fill="none"
          className="trackmap__ring"
          strokeWidth={RING_STROKE}
        />

        {scene.sectors.map((s) => (
          <SectorRay
            key={`sec-${s.pct}`}
            m={s}
            emphasize={
              scene.startFinish != null &&
              Math.abs(s.pct - scene.startFinish.pct) < 0.001
            }
          />
        ))}

        {scene.startFinish &&
        !scene.sectors.some(
          (s) => Math.abs(s.pct - scene.startFinish!.pct) < 0.001,
        ) ? (
          <SectorRay m={scene.startFinish} emphasize />
        ) : null}

        {scene.pitGhost ? <PitGhost m={scene.pitGhost} /> : null}

        {scene.cars.map((car) => (
          <CarMark
            key={car.carIdx}
            car={car}
            numberColor={classNumberColors?.get(car.carIdx)}
          />
        ))}

        <text x={CX} y={CY - 8} className="trackmap__center-lap">
          {lap != null && lap > 0 ? `Tour ${lap}` : map.trackName}
        </text>
        {timeLabel ? (
          <text x={CX} y={CY + 10} className="trackmap__center-time">
            {timeLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
