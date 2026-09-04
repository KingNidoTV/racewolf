import type { StrategyPlan } from "../../types/strategy";
import { driverById } from "../../utils/strategyPlan";

interface Props {
  plan: StrategyPlan;
  /** Seule la colonne pilote est modifiable. */
  editableDrivers?: boolean;
  onDriverChange?: (stintIndex: number, driverId: string) => void;
  compact?: boolean;
}

export function StrategyStintTable({
  plan,
  editableDrivers = false,
  onDriverChange,
  compact = false,
}: Props) {
  return (
    <div
      className={`strategy-table-wrap${compact ? " strategy-table-wrap--compact" : ""}`}
    >
      <table className="strategy-table">
        <thead>
          <tr>
            <th>Stint</th>
            <th>Heure</th>
            <th>Temps restant</th>
            <th>Durée relais</th>
            <th>Tours prévu</th>
            <th>Temps restant</th>
            <th>Pilote</th>
            <th>Météo</th>
            <th>Pneus</th>
            <th>Tours eff.</th>
            <th>Réparation</th>
          </tr>
        </thead>
        <tbody>
          {plan.stints.map((row, index) => {
            const driver = driverById(plan, row.driverId);
            const rowClass = [
              row.isActive ? "strategy-table__row--active" : "",
              row.isDone ? "strategy-table__row--done" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <tr key={row.stintNumber} className={rowClass || undefined}>
                <td>{row.stintNumber}</td>
                <td className="strategy-table__time">{row.startTime}</td>
                <td>{row.sessionTimeAtStart}</td>
                <td>{row.stintDuration}</td>
                <td>{row.plannedLaps}</td>
                <td>{row.sessionTimeAfter}</td>
                <td>
                  {editableDrivers && onDriverChange ? (
                    <select
                      className="strategy-table__driver-select"
                      value={row.driverId}
                      style={
                        driver
                          ? ({
                              "--driver-color": driver.color,
                            } as React.CSSProperties)
                          : undefined
                      }
                      onChange={(e) =>
                        onDriverChange(index, e.target.value)
                      }
                    >
                      {plan.drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="strategy-table__driver"
                      style={{
                        background: driver?.color ?? "#6b7280",
                      }}
                    >
                      {driver?.name ?? "—"}
                    </span>
                  )}
                </td>
                <td className="strategy-table__check">
                  {row.weatherChange ? "☑" : "☐"}
                </td>
                <td className="strategy-table__check">
                  {row.tireChange ? "☑" : "☐"}
                </td>
                <td>
                  {row.lapsCompleted != null ? row.lapsCompleted : "—"}
                </td>
                <td>{row.repairTime}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
