import type { SectorStatus } from "../../types/telemetry";

const ROW_CAPACITY = 5;

type LayoutTier = "single" | "double" | "triple";

function layoutTier(count: number): LayoutTier {
  if (count <= ROW_CAPACITY) return "single";
  if (count <= ROW_CAPACITY * 2) return "double";
  return "triple";
}

function buildRows(visible: SectorStatus[]): SectorStatus[][] {
  const count = visible.length;
  if (count <= ROW_CAPACITY) return [visible];
  if (count <= ROW_CAPACITY * 2) {
    return [visible.slice(0, ROW_CAPACITY), visible.slice(ROW_CAPACITY)];
  }
  return [
    visible.slice(0, ROW_CAPACITY),
    visible.slice(ROW_CAPACITY, ROW_CAPACITY * 2),
    visible.slice(ROW_CAPACITY * 2),
  ];
}

interface Props {
  statuses: SectorStatus[];
  sectorCount?: number;
}

export function StandingsSectorBars({ statuses, sectorCount }: Props) {
  const count = Math.max(1, sectorCount ?? statuses.length);
  const visible = Array.from({ length: count }, (_, i) => statuses[i] ?? "pending");
  const rows = buildRows(visible);
  const tier = layoutTier(count);

  return (
    <span
      className={`standings-sector-bars standings-sector-bars--${tier}`}
      aria-label="Secteurs tour en cours"
    >
      {rows.map((row, rowIndex) => (
        <span key={rowIndex} className="standings-sector-bars__row">
          {row.map((status, i) => (
            <span
              key={`${rowIndex}-${i}`}
              className={`standings-sector-bars__bar standings-sector-bars__bar--${status}`}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
