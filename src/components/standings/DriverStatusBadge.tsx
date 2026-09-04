import type { DriverStatusIndicator } from "../../types/telemetry";

interface Props {
  status: DriverStatusIndicator | null | undefined;
}

export function DriverStatusBadge({ status }: Props) {
  if (status === "box") {
    return (
      <span
        className="driver-status driver-status--box"
        title="Aux stands"
        aria-label="Aux stands"
      >
        BOX
      </span>
    );
  }

  if (status === "penalty") {
    return (
      <span
        className="driver-status driver-status--penalty"
        title="Pénalité"
        aria-label="Pénalité"
      />
    );
  }

  if (status === "damage") {
    return (
      <span
        className="driver-status driver-status--damage"
        title="Réparation / dégâts"
        aria-label="Réparation ou dégâts"
      />
    );
  }

  return null;
}
