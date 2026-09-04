import type { Driver, Stint } from "../../models";
import { formatSecondsToClock } from "../../engine";

interface Props {
  drivers: Driver[];
  relais: Stint[];
  avertissements?: string[];
  currentStintNumero: number;
  toursCompletesActuel: number;
  enPit?: boolean;
}

function driverById(drivers: Driver[], id: string): Driver | undefined {
  return drivers.find((d) => d.id === id);
}

function toursEffectues(
  stintNumero: number,
  currentStintNumero: number,
  toursCompletesActuel: number,
  toursPrevus: number,
): number {
  if (stintNumero < currentStintNumero) return toursPrevus;
  if (stintNumero === currentStintNumero) return toursCompletesActuel;
  return 0;
}

export function LiveStrategyTable({
  drivers,
  relais,
  avertissements = [],
  currentStintNumero,
  toursCompletesActuel,
  enPit = false,
}: Props) {
  if (relais.length === 0) {
    return (
      <p className="endurance-empty">
        Aucune stratégie projetée — validez un plan et connectez iRacing.
      </p>
    );
  }

  return (
    <section className="endurance-live-strategy">
      {avertissements.length > 0 ? (
        <ul className="endurance-warnings endurance-warnings--compact">
          {avertissements.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      ) : null}

      <div className="endurance-table-wrap">
        <table className="endurance-table endurance-table--strategy endurance-table--live">
          <thead>
            <tr>
              <th>Stint</th>
              <th>Heure début</th>
              <th>Heure fin</th>
              <th>Pilote</th>
              <th>Tours effectués</th>
              <th>Tours prévus</th>
              <th>Carburant</th>
              <th>Pneus</th>
              <th>Durée du relais</th>
            </tr>
          </thead>
          <tbody>
            {relais.map((stint) => {
              const pilote = driverById(drivers, stint.piloteId);
              const isCurrent = stint.numero === currentStintNumero;
              const effectues = toursEffectues(
                stint.numero,
                currentStintNumero,
                toursCompletesActuel,
                stint.toursPrevus,
              );

              return (
                <tr
                  key={stint.numero}
                  className={[
                    isCurrent ? "endurance-table__row--active" : null,
                    isCurrent && enPit ? "endurance-table__row--pit" : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <td>
                    {stint.numero}
                    {isCurrent ? (
                      <span className="endurance-table__active-tag">en cours</span>
                    ) : null}
                  </td>
                  <td>{stint.heureDebut}</td>
                  <td>{stint.heureFin}</td>
                  <td>
                    <span className="endurance-pilot">
                      <span
                        className="endurance-pilot__dot"
                        style={{ background: pilote?.couleur ?? "#666" }}
                      />
                      {pilote?.nom ?? "—"}
                    </span>
                  </td>
                  <td>{effectues}</td>
                  <td>{stint.toursPrevus}</td>
                  <td>
                    {stint.carburantUtiliseLitres != null &&
                    stint.carburantUtiliseLitres > 0
                      ? `${stint.carburantUtiliseLitres.toFixed(1)} L`
                      : "—"}
                  </td>
                  <td className="endurance-table__center">
                    {stint.changementPneus ? "Oui" : "—"}
                  </td>
                  <td>{formatSecondsToClock(stint.dureeSecondes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
