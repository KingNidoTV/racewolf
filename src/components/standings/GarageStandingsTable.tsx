import type { GarageRow } from "../../types/telemetry";
import { GarageStandingsRow } from "./GarageStandingsRow";

interface Props {
  rows: GarageRow[];
  sectorCount?: number;
}

export function GarageStandingsTable({ rows, sectorCount = 3 }: Props) {
  const sortRows = (items: GarageRow[], byClass: boolean) =>
    [...items].sort((a, b) => {
    const rawA = byClass ? (a.classPosition ?? 0) : a.position;
    const rawB = byClass ? (b.classPosition ?? 0) : b.position;
    const ap = rawA > 0 ? rawA : 9999;
    const bp = rawB > 0 ? rawB : 9999;
    if (ap !== bp) return ap - bp;
    return a.carNumber.localeCompare(b.carNumber, undefined, {
      numeric: true,
    });
  });

  if (rows.length === 0) return null;

  const classIds = new Set(
    rows.map((row) => row.classId).filter((id) => id != null),
  );
  const multiClass = classIds.size > 1;

  if (multiClass) {
    const groups = new Map<string, GarageRow[]>();
    for (const row of rows) {
      const key = String(row.classId ?? "unknown");
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    const ordered = [...groups.values()].sort((a, b) => {
      const speedA = a[0]?.classRelSpeed ?? 0;
      const speedB = b[0]?.classRelSpeed ?? 0;
      return speedB - speedA;
    });

    return (
      <ul className="garage-standings-list">
        {ordered.map((group) => {
          const first = group[0];
          const key = String(first?.classId ?? "unknown");
          return [
            <li key={`class-${key}`} className="garage-standings-list__class">
              {first?.className || `Catégorie ${key}`}
            </li>,
            ...sortRows(group, true).map((row) => (
              <GarageStandingsRow
                key={`${key}-${row.carNumber}`}
                row={row}
                sectorCount={sectorCount}
                useClassPosition
              />
            )),
          ];
        })}
      </ul>
    );
  }

  const sorted = sortRows(rows, false);

  return (
    <ul className="garage-standings-list">
      {sorted.map((row) => (
        <GarageStandingsRow
          key={`${row.position}-${row.carNumber}`}
          row={row}
          sectorCount={sectorCount}
        />
      ))}
    </ul>
  );
}
