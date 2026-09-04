import type { LiveFuel } from "../../live/models";

interface Props {
  fuel: LiveFuel;
}

export function LiveFuelCard({ fuel }: Props) {
  const conso = fuel.consommationLitresParTour;
  const hasConso = conso > 0;
  const tours =
    fuel.toursRestantsEstimes > 0 ? fuel.toursRestantsEstimes : null;

  return (
    <section className="endurance-live-fuel">
      <div className="endurance-live-fuel__head">
        <h3>Essence</h3>
        {fuel.estime && hasConso ? (
          <span className="endurance-live-fuel__badge">Moyenne en cours</span>
        ) : null}
      </div>
      <div className="endurance-live-fuel__grid">
        <div className="endurance-live-fuel__item">
          <span className="endurance-live-fuel__label">Niveau</span>
          <strong>
            {fuel.niveauLitres.toFixed(1)} L
            <span className="endurance-live-fuel__sub">
              {" "}
              · {fuel.pourcentage}%
            </span>
          </strong>
        </div>
        <div className="endurance-live-fuel__item">
          <span className="endurance-live-fuel__label">Moyenne / tour</span>
          <strong>
            {hasConso ? `${conso.toFixed(2)} L` : "—"}
          </strong>
        </div>
        <div className="endurance-live-fuel__item">
          <span className="endurance-live-fuel__label">Tours restants</span>
          <strong>{tours != null ? `~${tours}` : "—"}</strong>
        </div>
      </div>
      {fuel.capaciteLitres > 0 ? (
        <div className="endurance-live-fuel__bar">
          <div
            className="endurance-live-fuel__fill"
            style={{ width: `${Math.min(100, fuel.pourcentage)}%` }}
          />
        </div>
      ) : null}
    </section>
  );
}
