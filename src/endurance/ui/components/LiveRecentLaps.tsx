import type { Driver } from "../../models";
import type { LiveStint } from "../../live/models";
import { formatSecondsToLapTime } from "../../engine";

interface Props {
  stint: LiveStint;
  drivers: Driver[];
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(3)}`;
}

export function LiveRecentLaps({ stint, drivers }: Props) {
  const laps = stint.historiqueTours.slice(-5).reverse();
  const driver = drivers.find((d) => d.id === stint.piloteId);
  const chronoPrevu = driver?.chronoSecondes ?? 0;

  return (
    <section className="endurance-live-laps" aria-label="Derniers tours">
      <header className="endurance-live-laps__header">
        <h3>5 derniers tours</h3>
        <p>
          Delta vs chrono prépa
          {chronoPrevu > 0
            ? ` (${formatSecondsToLapTime(chronoPrevu)})`
            : ""}
        </p>
      </header>

      {laps.length === 0 ? (
        <p className="endurance-live-laps__empty">
          Aucun tour chronométré pour le moment.
        </p>
      ) : (
        <div className="endurance-table-wrap">
          <table className="endurance-table endurance-table--laps">
            <thead>
              <tr>
                <th>Tour</th>
                <th>Temps</th>
                <th>Δ chrono</th>
              </tr>
            </thead>
            <tbody>
              {laps.map((lap) => {
                const deltaClass =
                  lap.deltaTempsSec < -0.01
                    ? "endurance-live-laps__delta--faster"
                    : lap.deltaTempsSec > 0.01
                      ? "endurance-live-laps__delta--slower"
                      : undefined;
                return (
                  <tr key={lap.numeroTour}>
                    <td>{lap.numeroTour}</td>
                    <td>{formatSecondsToLapTime(lap.tourSecondes)}</td>
                    <td className={deltaClass}>
                      {formatDelta(lap.deltaTempsSec)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
