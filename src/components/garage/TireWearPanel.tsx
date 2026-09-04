import type { TireWearInfo } from "../../types/telemetry";

interface Props {
  wear: TireWearInfo;
}

function WearCell({ label, value }: { label: string; value: number }) {
  const low = value < 35;
  return (
    <div className={`tire-wear-cell${low ? " tire-wear-cell--low" : ""}`}>
      <span className="tire-wear-cell__label">{label}</span>
      <div className="tire-wear-cell__bar">
        <div className="tire-wear-cell__fill" style={{ width: `${value}%` }} />
      </div>
      <span className="tire-wear-cell__pct">{value}%</span>
    </div>
  );
}

export function TireWearPanel({ wear }: Props) {
  const { corners, averagePercent } = wear;
  return (
    <section className="garage-panel garage-panel--wear">
      <h3 className="garage-panel__title">
        Usure pneus
        <span className="garage-panel__subtitle">Moy. {averagePercent}%</span>
      </h3>
      <div className="tire-wear-grid">
        <WearCell label="AV G" value={corners.lf} />
        <WearCell label="AV D" value={corners.rf} />
        <WearCell label="AR G" value={corners.lr} />
        <WearCell label="AR D" value={corners.rr} />
      </div>
    </section>
  );
}
