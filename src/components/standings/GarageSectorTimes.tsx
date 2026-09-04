import type { SectorStatus } from "../../types/telemetry";

interface Props {
  times: string[];
  statuses: SectorStatus[];
  sectorCount?: number;
}

export function GarageSectorTimes({
  times,
  statuses,
  sectorCount = 3,
}: Props) {
  const count = Math.max(1, Math.min(sectorCount, times.length));
  return (
    <span className="garage-sector-times">
      {times.slice(0, count).map((time, i) => (
        <span
          key={i}
          className={`garage-sector-times__chip garage-sector-times__chip--${statuses[i]}`}
        >
          {time}
        </span>
      ))}
    </span>
  );
}
