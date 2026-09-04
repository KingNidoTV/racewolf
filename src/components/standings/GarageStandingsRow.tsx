import type { GarageRow } from "../../types/telemetry";
import { useDisplayNationality } from "../../hooks/useDisplayNationality";
import { CarLogoSquare } from "./CarLogoSquare";
import { DriverStatusBadge } from "./DriverStatusBadge";
import { FlagImage } from "./FlagImage";
import { GarageSectorTimes } from "./GarageSectorTimes";
import { TireBadge } from "./TireBadge";

interface Props {
  row: GarageRow;
  sectorCount?: number;
  useClassPosition?: boolean;
}

export function GarageStandingsRow({
  row,
  sectorCount = 3,
  useClassPosition = false,
}: Props) {
  const showBox = row.status === "box";
  const nationality = useDisplayNationality(row.nationality, row.isPlayer);

  return (
    <li
      className={
        row.isPlayer ? "garage-standings-list__row--player" : undefined
      }
    >
      <span className="garage-standings-list__pos">
        {useClassPosition
          ? row.classPosition && row.classPosition > 0
            ? row.classPosition
            : "—"
          : row.position < 1
            ? "—"
            : row.position}
      </span>

      <CarLogoSquare
        carNumber={row.carNumber}
        carBrand={row.carBrand}
        carColor={row.carColor}
      />

      <span className="garage-standings-list__num">#{row.carNumber}</span>

      <span className="garage-standings-list__flag">
        <FlagImage nationality={nationality} />
      </span>

      <span className="garage-standings-list__name">{row.driverName}</span>

      <span className="garage-standings-list__time">
        <span>{row.bestTime}</span>
        {row.gap && row.gap !== "—" ? (
          <span className="garage-standings-list__gap">{row.gap}</span>
        ) : null}
      </span>

      <span className="garage-standings-list__laps">{row.lapsCompleted}</span>

      <span className="garage-standings-list__tire">
        <TireBadge compound={row.tireCompound} stintLaps={row.lapsLastStint} />
      </span>

      <span className="garage-standings-list__box">
        {showBox ? <DriverStatusBadge status="box" /> : null}
      </span>

      <span className="garage-standings-list__best-lap-num">
        {row.bestLapNumber > 0 ? row.bestLapNumber : "—"}
      </span>

      <span className="garage-standings-list__stint-laps">
        {row.lapsLastStint > 0 ? row.lapsLastStint : "—"}
      </span>

      <span className="garage-standings-list__sectors">
        <GarageSectorTimes
          times={row.bestLapSectorTimes}
          statuses={row.bestLapSectorStatus}
          sectorCount={sectorCount}
        />
      </span>
    </li>
  );
}
