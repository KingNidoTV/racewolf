import { useMemo } from "react";
import type { StandingsEntry } from "../../types/telemetry";
import {
  buildRaceStandingsList,
  type RaceStandingsOptions,
} from "../../utils/filterStandings";
import {
  buildClassSpeedRankMap,
  classColorForEntry,
  isMultiClassField,
} from "../../utils/classColors";
import { StandingsRow } from "./StandingsRow";

interface Props {
  entries: StandingsEntry[];
  mode: "race" | "relative" | "garage";
  showSectorBars?: boolean;
  sectorCount?: number;
  raceOptions?: RaceStandingsOptions;
  /** Force multiclasse (sinon auto-détecté). */
  multiClass?: boolean;
  /** Entries de référence pour le rang des catégories (ex. classement complet). */
  classRankSource?: StandingsEntry[];
}

function relativeGapSortValue(row: StandingsEntry): number {
  if (row.isPlayer) return 0;
  const gap = row.gap.trim();
  if (!gap || gap === "—") return 0;
  const match = gap.match(/^([+-])(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * Number.parseFloat(match[2]);
}

export function StandingsList({
  entries,
  mode,
  showSectorBars = false,
  sectorCount = 3,
  raceOptions,
  multiClass: multiClassProp,
  classRankSource,
}: Props) {
  const rankSource = classRankSource ?? entries;
  const multiClass =
    multiClassProp ?? (mode !== "garage" && isMultiClassField(rankSource));

  const rankByClass = useMemo(
    () => (multiClass ? buildClassSpeedRankMap(rankSource) : new Map()),
    [multiClass, rankSource],
  );

  const items = useMemo(() => {
    if (mode === "garage") {
      return [...entries]
        .sort((a, b) => a.position - b.position)
        .map((row) => ({ kind: "row" as const, row }));
    }
    if (mode === "race") {
      return buildRaceStandingsList(entries, raceOptions);
    }
    /** + devant en haut, pilote au centre, − derrière en bas. */
    return [...entries]
      .sort((a, b) => relativeGapSortValue(b) - relativeGapSortValue(a))
      .map((row) => ({ kind: "row" as const, row }));
  }, [entries, mode, raceOptions]);

  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      className={[
        "race-standings-list",
        mode === "garage" ? "race-standings-list--garage" : null,
        showSectorBars ? "race-standings-list--sectors" : null,
        multiClass ? "race-standings-list--multiclass" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {items.map((item, index) =>
        item.kind === "separator" ? (
          <li
            key={`sep-${index}`}
            className="race-standings-list__separator"
            aria-hidden
          />
        ) : item.kind === "gap" ? (
          <li
            key={`gap-${index}`}
            className="race-standings-list__gap"
            aria-hidden
          >
            …
          </li>
        ) : (
          <StandingsRow
            key={`${item.row.position}-${item.row.carNumber}-${item.row.classId ?? 0}`}
            row={item.row}
            mode={mode}
            showSectorBars={showSectorBars}
            sectorCount={sectorCount}
            multiClass={multiClass}
            classColor={classColorForEntry(item.row, rankByClass)}
          />
        ),
      )}
    </ul>
  );
}
