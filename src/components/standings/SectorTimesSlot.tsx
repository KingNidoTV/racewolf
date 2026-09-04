interface Props {
  times: string[];
  /** Garage : S1 · S2 · S3 sur une seule ligne. */
  inline?: boolean;
}

export function SectorTimesSlot({ times, inline = false }: Props) {
  if (inline) {
    return (
      <span className="race-standings-list__tire-slot sector-times-slot sector-times-slot--inline">
        {times.join(" · ")}
      </span>
    );
  }

  return (
    <span className="race-standings-list__tire-slot sector-times-slot">
      {times.map((time, i) => (
        <span key={i} className="sector-times-slot__row">
          <span className="sector-times-slot__label">S{i + 1}</span>
          <span className="sector-times-slot__time">{time}</span>
        </span>
      ))}
    </span>
  );
}
