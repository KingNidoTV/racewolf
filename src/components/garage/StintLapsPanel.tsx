import type { StintLapSummary } from "../../types/telemetry";

interface Props {
  summary: StintLapSummary;
}

export function StintLapsPanel({ summary }: Props) {
  return (
    <section className="garage-panel garage-panel--stint">
      <h3 className="garage-panel__title">
        Derniers tours — relais
        <span className="garage-panel__subtitle">
          Moy. {summary.averageLap}
        </span>
      </h3>
      {summary.laps.length === 0 ? (
        <p className="garage-panel__empty">En attente de tours complétés…</p>
      ) : (
        <table className="garage-mini-table">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Chrono</th>
              <th>Δ moy.</th>
            </tr>
          </thead>
          <tbody>
            {summary.laps.map((lap) => (
              <tr key={lap.lapNumber}>
                <td>T{lap.lapNumber}</td>
                <td>{lap.lapTime}</td>
                <td
                  className={
                    lap.deltaToAvg.startsWith("+")
                      ? "garage-mini-table__slow"
                      : lap.deltaToAvg.startsWith("-")
                        ? "garage-mini-table__fast"
                        : undefined
                  }
                >
                  {lap.deltaToAvg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
