import type { ReactNode } from "react";
import type { StandingsEntry } from "../../types/telemetry";
import type { DriverStatusIndicator } from "../../types/telemetry";
import { DriverStatusBadge } from "./DriverStatusBadge";
import { TireBadge } from "./TireBadge";

interface Props {
  row: Pick<
    StandingsEntry,
    | "tireCompound"
    | "stintLaps"
    | "isConnected"
    | "inPits"
    | "hasPenalty"
    | "hasDamage"
    | "status"
  >;
}

function resolveMainSlot(row: Props["row"]): ReactNode {
  if (row.isConnected === false) {
    return (
      <span className="race-standings-list__offline" title="Pilote déconnecté">
        OUT
      </span>
    );
  }

  const status: DriverStatusIndicator | null =
    row.status ??
    (row.inPits
      ? "box"
      : row.hasDamage
        ? "damage"
        : row.hasPenalty
          ? "penalty"
          : null);

  if (status) {
    return <DriverStatusBadge status={status} />;
  }

  return (
    <TireBadge
      compound={row.tireCompound ?? "primary"}
      stintLaps={row.stintLaps ?? 0}
    />
  );
}

/** Pneu, ou BOX / OUT / drapeaux pilote à la place du pneu. */
export function TireOrStatusSlot({ row }: Props) {
  return (
    <span className="race-standings-list__tire-col">
      <span className="race-standings-list__tire-slot">{resolveMainSlot(row)}</span>
    </span>
  );
}
