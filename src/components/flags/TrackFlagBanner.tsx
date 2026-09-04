import type { TrackFlagState } from "../../types/telemetry";

interface Props {
  flag: TrackFlagState | null;
}

/** Barre drapeau piste intégrée au panneau classement (style broadcast F1). */
export function TrackFlagBanner({ flag }: Props) {
  if (!flag) return null;

  return (
    <div
      className={`standings-track-flag standings-track-flag--${flag.kind}`}
      role="status"
      aria-label={flag.label}
    >
      <div className="standings-track-flag__main">
        <span className="standings-track-flag__title">
          {flag.label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
