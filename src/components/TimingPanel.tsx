import type { SectorStatus, TimingInfo } from "../types/telemetry";

interface Props {
  timing: TimingInfo;
  recentLapsCount?: number;
}

const STATUS_CLASS: Record<SectorStatus, string> = {
  personal: "sector-pill--personal",
  record: "sector-pill--record",
  slower: "sector-pill--slower",
  pending: "sector-pill--pending",
};

/** Comme le classement / iRacing : 5 secteurs par ligne. */
const ROW_CAPACITY = 5;

function chunkSectors<T>(items: T[]): T[][] {
  if (items.length === 0) return [];
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += ROW_CAPACITY) {
    rows.push(items.slice(i, i + ROW_CAPACITY));
  }
  return rows;
}

export function TimingPanel({ timing, recentLapsCount = 5 }: Props) {
  const sectorCount = Math.max(
    1,
    timing.sectorCount || timing.sectorTimes?.length || 1,
  );
  const sectors = Array.from({ length: sectorCount }, (_, i) => ({
    index: i,
    time: timing.sectorTimes?.[i] ?? "—",
    status: timing.sectorStatus?.[i] ?? ("pending" as SectorStatus),
  }));
  const rows = chunkSectors(sectors);
  const recent = (timing.recentLaps ?? []).slice(
    0,
    Math.max(1, recentLapsCount),
  );

  return (
    <div className="panel timing-panel" aria-label="Chronos">
      <div
        className={[
          "sector-bar",
          "sector-bar--top",
          rows.length > 1 ? `sector-bar--rows-${Math.min(rows.length, 3)}` : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="sector-bar__row">
            {row.map((sector) => {
              const hasTime =
                sector.time !== "—" && sector.time.trim() !== "";
              return (
                <div
                  key={sector.index}
                  className={[
                    "sector-pill",
                    hasTime
                      ? STATUS_CLASS[sector.status]
                      : "sector-pill--pending",
                  ].join(" ")}
                >
                  <span className="sector-pill__label">
                    S{sector.index + 1}
                  </span>
                  <span className="sector-pill__time">
                    {hasTime ? sector.time : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="timing-main">
        <div className="panel__row">
          <span className="panel__label">Meilleur</span>
          <span className="panel__value">{timing.bestLap}</span>
        </div>
      </div>

      {recent.length > 0 ? (
        <table className="timing-recent-laps">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Chrono</th>
              <th>Δ préc.</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((lap) => (
              <tr key={lap.lapNumber}>
                <td>T{lap.lapNumber}</td>
                <td>{lap.lapTime}</td>
                <td
                  className={
                    lap.deltaToPrevious.startsWith("+")
                      ? "timing-recent-laps__slow"
                      : lap.deltaToPrevious.startsWith("-")
                        ? "timing-recent-laps__fast"
                        : undefined
                  }
                >
                  {lap.deltaToPrevious}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
