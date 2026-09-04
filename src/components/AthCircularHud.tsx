import type { AthHud } from "../types/telemetry";

interface Props {
  ath: AthHud;
}

const SIZE = 220;
const CX = 110;
const CY = 110;
const RPM_R = 92;
const INPUT_R = 72;

/** Gauche : accélérateur (bas → haut). */
const THROTTLE_START = 198;
const THROTTLE_END = 342;

/** Droite haut : embrayage (référence pour la taille du quart d’arc). */
const CLUTCH_START = 12;
const CLUTCH_END = 78;
const QUARTER_ARC_SPAN = CLUTCH_END - CLUTCH_START;

/**
 * Droite bas : frein — même envergure que l’embrayage, symétrique.
 * Toujours startDeg < endDeg pour éviter le grand arc SVG (3/4 de cercle).
 */
const BRAKE_ARC_START = 180 - CLUTCH_END;
const BRAKE_ARC_END = 180 - CLUTCH_START;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, endDeg);
  const end = polar(cx, cy, r, startDeg);
  let sweep = endDeg - startDeg;
  if (sweep < 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

function rpmTicks(maxRpm: number) {
  const marks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    Math.round(maxRpm * f),
  );
  const start = 215;
  const span = 290;
  return marks.map((v) => {
    const deg = start + (v / maxRpm) * span;
    const p = polar(CX, CY, RPM_R + 6, deg);
    return { v, x: p.x, y: p.y };
  });
}

function formatFuelLaps(laps: number): string {
  return `~${Math.round(laps)} tours`;
}

export function AthCircularHud({ ath }: Props) {
  const maxRpm = Math.max(3000, ath.maxRpm);
  const rpmPct = Math.min(1, Math.max(0, ath.rpm / maxRpm));
  const throttlePct = Math.min(1, Math.max(0, ath.throttle));
  const brakePct = Math.min(1, Math.max(0, ath.brake));
  /** iRacing : 0 = embrayage enfoncé, 1 = relâché. */
  const clutchReleased = Math.min(1, Math.max(0, ath.clutch));
  const clutchPct = 1 - clutchReleased;

  const arcStart = 215;
  const arcSpan = 290;
  const rpmEnd = arcStart + arcSpan * rpmPct;

  const throttleSpan = THROTTLE_END - THROTTLE_START;
  const throttleFillEnd = THROTTLE_START + throttleSpan * throttlePct;

  const clutchFillEnd = CLUTCH_START + QUARTER_ARC_SPAN * clutchPct;

  /** Remplissage depuis le bas (BRAKE_ARC_END) vers la droite. */
  const brakeFillStart = BRAKE_ARC_END - QUARTER_ARC_SPAN * brakePct;

  const showClutch = clutchPct >= 0.25;

  const ticks = rpmTicks(maxRpm);
  const showBattery = ath.batteryPercent != null;
  const showP2p = ath.pushToPassPercent != null;
  const showTemps = ath.waterTempC != null || ath.oilTempC != null;
  const showFuelLaps = ath.fuelLapsRemaining != null && ath.fuelLapsRemaining > 0;
  const gearLabel =
    ath.gear === 0 ? "N" : ath.gear < 0 ? "R" : String(ath.gear);

  return (
    <div className="ath-circular" aria-label="RaceWolf télémétrie">
      <svg
        className="ath-circular__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
      >
        <path
          className="ath-circular__rpm-bg"
          d={arcPath(CX, CY, RPM_R, arcStart, arcStart + arcSpan)}
        />
        {rpmPct > 0.01 ? (
          <path
            className="ath-circular__rpm-fill"
            d={arcPath(CX, CY, RPM_R, arcStart, rpmEnd)}
          />
        ) : null}

        {ticks.map(({ v, x, y }) => (
          <text
            key={v}
            className="ath-circular__tick"
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {v >= 1000 ? `${Math.round(v / 1000)}k` : v}
          </text>
        ))}

        <path
          className="ath-circular__input-bg"
          d={arcPath(CX, CY, INPUT_R, THROTTLE_START, THROTTLE_END)}
        />
        {throttlePct > 0.01 ? (
          <path
            className="ath-circular__throttle-fill"
            d={arcPath(CX, CY, INPUT_R, THROTTLE_START, throttleFillEnd)}
          />
        ) : null}

        <path
          className="ath-circular__input-bg"
          d={arcPath(CX, CY, INPUT_R, CLUTCH_START, CLUTCH_END)}
        />
        {showClutch ? (
          <path
            className="ath-circular__clutch-fill"
            d={arcPath(CX, CY, INPUT_R, CLUTCH_START, clutchFillEnd)}
          />
        ) : null}

        <path
          className="ath-circular__input-bg"
          d={arcPath(CX, CY, INPUT_R, BRAKE_ARC_START, BRAKE_ARC_END)}
        />
        {brakePct > 0.01 ? (
          <path
            className="ath-circular__brake-fill"
            d={arcPath(CX, CY, INPUT_R, brakeFillStart, BRAKE_ARC_END)}
          />
        ) : null}

        <text className="ath-circular__speed-value" x={CX} y={CY - 20}>
          {ath.speedKmh}
        </text>
        <text className="ath-circular__speed-unit" x={CX} y={CY - 4}>
          KMH
        </text>
        <text className="ath-circular__rpm-value" x={CX} y={CY + 16}>
          {ath.rpm.toLocaleString("fr-FR")}
        </text>
        <text className="ath-circular__rpm-unit" x={CX} y={CY + 30}>
          RPM
        </text>

        {showBattery ? (
          <g
            className="ath-circular__battery-center"
            transform={`translate(${CX}, ${CY + 48})`}
          >
            <rect
              className="ath-circular__battery-shell"
              x={-14}
              y={-7}
              width={28}
              height={14}
              rx={2}
            />
            <rect
              className="ath-circular__battery-tip"
              x={14}
              y={-4}
              width={4}
              height={8}
            />
            <rect
              className="ath-circular__battery-fill"
              x={-12}
              y={-5}
              width={Math.max(0, 24 * (ath.batteryPercent! / 100))}
              height={10}
              rx={1}
            />
            <text className="ath-circular__battery-pct" y={1}>
              {Math.round(ath.batteryPercent!)}%
            </text>
          </g>
        ) : null}

        <text
          className="ath-circular__gear-value"
          x={CX}
          y={CY + (showBattery ? 72 : 58)}
        >
          {gearLabel}
        </text>

        {showP2p ? (
          <g className="ath-circular__p2p" transform="translate(148, 168)">
            <text className="ath-circular__aux-title" x={0} y={0}>
              P2P
            </text>
            <rect
              className="ath-circular__p2p-bg"
              x={0}
              y={4}
              width={44}
              height={6}
              rx={2}
            />
            <rect
              className="ath-circular__p2p-fill"
              x={0}
              y={4}
              width={44 * (ath.pushToPassPercent! / 100)}
              height={6}
              rx={2}
            />
          </g>
        ) : null}
      </svg>

      {showTemps ? (
        <div className="ath-circular__temps" aria-label="Températures moteur">
          {ath.waterTempC != null ? (
            <span className="ath-circular__temp">
              <span className="ath-circular__temp-icon" aria-hidden>
                💧
              </span>
              <span className="ath-circular__temp-value">{ath.waterTempC}°</span>
            </span>
          ) : null}
          {ath.oilTempC != null ? (
            <span className="ath-circular__temp">
              <span className="ath-circular__temp-icon" aria-hidden>
                🛢️
              </span>
              <span className="ath-circular__temp-value">{ath.oilTempC}°</span>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="ath-circular__fuel">
        <div className="ath-circular__fuel-head">
          <span className="ath-circular__fuel-label">ESSENCE</span>
          <span className="ath-circular__fuel-text">
            {ath.fuelLiters.toFixed(1)} L · {Math.round(ath.fuelPercent)}%
            {showFuelLaps
              ? ` · ${formatFuelLaps(ath.fuelLapsRemaining!)}`
              : null}
          </span>
        </div>
        <div className="ath-circular__fuel-bar">
          <div
            className="ath-circular__fuel-fill"
            style={{ width: `${Math.min(100, ath.fuelPercent)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
