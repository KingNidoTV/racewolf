import type { TireCompound } from "../../types/telemetry";

interface Props {
  compound: TireCompound;
  stintLaps: number;
}

const COMPOUND_LABEL: Record<TireCompound, string> = {
  primary: "Base",
  alternate: "Alternate",
  wet: "Pluie",
};

export function TireBadge({ compound, stintLaps }: Props) {
  const safe: TireCompound =
    compound === "alternate" || compound === "wet" ? compound : "primary";
  const laps = Math.max(0, Math.round(stintLaps));
  const label = COMPOUND_LABEL[safe];

  return (
    <div
      className={`tire-badge tire-badge--${safe}`}
      title={`${label} — ${laps} tour${laps > 1 ? "s" : ""} sur ce relais`}
      aria-label={`${label}, ${laps} tours sur le relais actuel`}
    >
      <svg className="tire-badge__shape" viewBox="0 0 32 40" aria-hidden>
        <path
          d="M6 8c0-4 4-6 10-6s10 2 10 6v24c0 4-4 6-10 6s-10-2-10-6V8z"
          fill="currentColor"
          opacity="0.35"
        />
        <path
          d="M8 10c0-3 3.5-4 8-4s8 1 8 4v20c0 3-3.5 4-8 4s-8-1-8-4V10z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
      <span className="tire-badge__laps">{laps}</span>
    </div>
  );
}
