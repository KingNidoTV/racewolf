import type { CSSProperties } from "react";
import type { StandingsEntry } from "../../types/telemetry";
import { formatGapOneDecimal } from "../../utils/formatGap";
import type { ClassSpeedColor } from "../../utils/classColors";
import { CarLogoSquare } from "./CarLogoSquare";
import { useDisplayNationality } from "../../hooks/useDisplayNationality";
import { FlagImage } from "./FlagImage";
import { SectorTimesSlot } from "./SectorTimesSlot";
import { StandingsSectorBars } from "./StandingsSectorBars";
import { TireOrStatusSlot } from "./TireOrStatusSlot";

interface Props {
  row: StandingsEntry;
  mode?: "race" | "relative" | "garage";
  showSectorBars?: boolean;
  sectorCount?: number;
  /** Multiclasse : affiche pos. catégorie + fond. */
  multiClass?: boolean;
  classColor?: ClassSpeedColor | null;
}

function timeColumn(
  row: StandingsEntry,
  mode: "race" | "relative" | "garage",
): string {
  if (mode === "relative") {
    return formatGapOneDecimal(row.gap || "—");
  }
  if (mode === "garage") {
    return row.bestTime ?? "—";
  }
  if (row.position === 1) return row.bestTime ?? "—";
  return formatGapOneDecimal(row.gap ?? "—");
}

function rowClassName(
  row: StandingsEntry,
  mode: "race" | "relative" | "garage",
  multiClass: boolean,
  classColor: ClassSpeedColor | null | undefined,
): string | undefined {
  const classes: string[] = [];
  if (row.isPlayer) {
    classes.push("race-standings-list__row--player");
  }
  if (mode !== "garage" && row.isSessionFastest) {
    classes.push("race-standings-list__row--fastest");
  }
  if (multiClass && classColor) {
    classes.push(`race-standings-list__row--class-${classColor.name}`);
  }
  return classes.length > 0 ? classes.join(" ") : undefined;
}

function relativeTimeClass(
  row: StandingsEntry,
  mode: "race" | "relative" | "garage",
): string | undefined {
  if (mode !== "relative" || row.isPlayer) return undefined;
  const gap = row.gap.trim();
  if (gap.startsWith("+")) return "race-standings-list__time--ahead";
  if (gap.startsWith("-")) return "race-standings-list__time--behind";
  return undefined;
}

export function StandingsRow({
  row,
  mode = "race",
  showSectorBars = false,
  sectorCount = 3,
  multiClass = false,
  classColor = null,
}: Props) {
  const nationality = useDisplayNationality(row.nationality, row.isPlayer);
  const timeClass = relativeTimeClass(row, mode);
  const classPos =
    row.classPosition != null && row.classPosition > 0
      ? row.classPosition
      : null;

  return (
    <li
      className={rowClassName(row, mode, multiClass, classColor)}
      style={
        multiClass && classColor
          ? ({
              "--class-accent": classColor.accent,
              "--class-bg": classColor.bg,
            } as CSSProperties)
          : undefined
      }
    >
      <span className="race-standings-list__pos" title="Position générale">
        {row.position < 1 ? "—" : row.position}
      </span>

      {multiClass ? (
        <span
          className="race-standings-list__class-pos"
          title={
            row.className
              ? `Position ${row.className}`
              : "Position catégorie"
          }
        >
          {classPos ?? "—"}
        </span>
      ) : null}

      <CarLogoSquare
        carNumber={row.carNumber}
        carBrand={row.carBrand ?? "—"}
        carColor={row.carColor ?? "#6b7280"}
      />

      <span className="race-standings-list__num">#{row.carNumber}</span>

      <span className="race-standings-list__flag">
        <FlagImage nationality={nationality} />
      </span>

      <span className="race-standings-list__name">{row.name}</span>

      <span
        className={["race-standings-list__time", timeClass]
          .filter(Boolean)
          .join(" ")}
      >
        {mode === "garage" ? (
          <span className="race-standings-list__time-inline">
            <span>{row.bestTime ?? "—"}</span>
            {row.gap && row.gap !== "—" ? (
              <span className="race-standings-list__gap-inline">{row.gap}</span>
            ) : null}
          </span>
        ) : mode === "relative" ? (
          <span className="race-standings-list__time-inline race-standings-list__time-inline--relative">
            <span className={timeClass ?? undefined}>
              {formatGapOneDecimal(row.gap || "—")}
            </span>
            {row.lastLap && row.lastLap !== "—" ? (
              <span className="race-standings-list__last-lap-inline">
                {row.lastLap}
              </span>
            ) : null}
          </span>
        ) : (
          timeColumn(row, mode)
        )}
      </span>

      {mode === "garage" && row.bestLapSectorTimes ? (
        <SectorTimesSlot times={row.bestLapSectorTimes} inline />
      ) : (
        <span className="race-standings-list__extras-col">
          {showSectorBars ? (
            <StandingsSectorBars
              statuses={row.bestLapSectorStatus ?? []}
              sectorCount={sectorCount}
            />
          ) : null}
          <TireOrStatusSlot row={row} />
        </span>
      )}
    </li>
  );
}
