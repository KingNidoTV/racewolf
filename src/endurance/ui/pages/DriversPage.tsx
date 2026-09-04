import type { AbsenceSlot, Driver } from "../../models";
import { createDriver } from "../../models";
import type { EnduranceLiveSession } from "../../models/LiveSession";
import { roundConsommationLitresParTour } from "../../engine";
import { LapTimeInput } from "../components/LapTimeInput";
import { DecimalInput } from "../components/DecimalInput";

interface Props {
  drivers: Driver[];
  live?: EnduranceLiveSession;
  onChange: (drivers: Driver[]) => void;
}

function updateAt<T>(list: T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}

export function DriversPage({ drivers, live, onChange }: Props) {
  const updateDriver = (index: number, patch: Partial<Driver>) => {
    const current = drivers[index];
    if (!current) return;
    onChange(updateAt(drivers, index, { ...current, ...patch }));
  };

  const addDriver = () => {
    onChange([...drivers, createDriver(drivers.length)]);
  };

  const removeDriver = (index: number) => {
    if (drivers.length <= 1) return;
    onChange(drivers.filter((_, i) => i !== index));
  };

  const updateAbsence = (
    driverIndex: number,
    absenceIndex: number,
    patch: Partial<AbsenceSlot>,
  ) => {
    const driver = drivers[driverIndex];
    if (!driver) return;
    const absences = driver.absences.map((slot, i) =>
      i === absenceIndex ? { ...slot, ...patch } : slot,
    );
    updateDriver(driverIndex, { absences });
  };

  const addAbsence = (driverIndex: number) => {
    const driver = drivers[driverIndex];
    if (!driver) return;
    updateDriver(driverIndex, {
      absences: [...driver.absences, { debut: "18:00", fin: "20:00" }],
    });
  };

  const removeAbsence = (driverIndex: number, absenceIndex: number) => {
    const driver = drivers[driverIndex];
    if (!driver) return;
    updateDriver(driverIndex, {
      absences: driver.absences.filter((_, i) => i !== absenceIndex),
    });
  };

  const liveConnected = live?.connected ?? false;
  const livePractice = live?.isPractice ?? false;

  return (
    <section className="endurance-page">
      <header className="endurance-page__header endurance-page__header--row">
        <div>
          <h2>Gestion des pilotes</h2>
          <p>
            Chronos, consommation carburant (L/tour), contraintes de relais et
            absences.
            {liveConnected && livePractice && live && live.consommationLitresParHeure > 0 ? (
              <>
                {" "}
                Conso iRacing convertie en L/tour (pilotes estimés).
              </>
            ) : null}
          </p>
        </div>
        <button type="button" className="endurance-btn" onClick={addDriver}>
          + Ajouter un pilote
        </button>
      </header>

      <div className="endurance-table-wrap">
        <table className="endurance-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Couleur</th>
              <th>Chrono</th>
              <th>Conso (L/tour)</th>
              <th>Relais max</th>
              <th>Double relais</th>
              <th>Absences</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver, index) => (
              <tr key={driver.id}>
                <td>
                  <input
                    className="endurance-table__input"
                    value={driver.nom}
                    onChange={(e) =>
                      updateDriver(index, { nom: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    type="color"
                    className="endurance-table__color"
                    value={driver.couleur}
                    onChange={(e) =>
                      updateDriver(index, { couleur: e.target.value })
                    }
                  />
                </td>
                <td>
                  <LapTimeInput
                    className="endurance-table__input endurance-table__input--lap"
                    valueSec={driver.chronoSecondes}
                    onChange={(chronoSecondes) =>
                      updateDriver(index, { chronoSecondes })
                    }
                  />
                </td>
                <td>
                  <DecimalInput
                    className="endurance-table__input endurance-table__input--num"
                    value={driver.consommationLitresParTour}
                    min={0}
                    max={20}
                    step={0.1}
                    decimals={1}
                    onChange={(consommationLitresParTour) =>
                      updateDriver(index, {
                        consommationLitresParTour: roundConsommationLitresParTour(
                          consommationLitresParTour,
                        ),
                        consommationEstimee: false,
                      })
                    }
                  />
                  {driver.consommationEstimee ? (
                    <span className="endurance-table__sub">estimé</span>
                  ) : null}
                </td>
                <td>
                  <input
                    type="number"
                    className="endurance-table__input endurance-table__input--num"
                    min={1}
                    max={99}
                    value={driver.relaisMax}
                    onChange={(e) =>
                      updateDriver(index, {
                        relaisMax: Number.parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                </td>
                <td className="endurance-table__center">
                  <input
                    type="checkbox"
                    checked={driver.doubleRelaisAutorise}
                    onChange={(e) =>
                      updateDriver(index, {
                        doubleRelaisAutorise: e.target.checked,
                      })
                    }
                  />
                </td>
                <td>
                  <div className="endurance-absences">
                    {driver.absences.map((absence, absenceIndex) => (
                      <div
                        key={`${driver.id}-abs-${absenceIndex}`}
                        className="endurance-absences__row"
                      >
                        <input
                          type="time"
                          value={absence.debut}
                          onChange={(e) =>
                            updateAbsence(index, absenceIndex, {
                              debut: e.target.value,
                            })
                          }
                        />
                        <span>→</span>
                        <input
                          type="time"
                          value={absence.fin}
                          onChange={(e) =>
                            updateAbsence(index, absenceIndex, {
                              fin: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          className="endurance-btn endurance-btn--ghost endurance-btn--xs"
                          onClick={() => removeAbsence(index, absenceIndex)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="endurance-btn endurance-btn--ghost endurance-btn--xs"
                      onClick={() => addAbsence(index)}
                    >
                      + absence
                    </button>
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className="endurance-btn endurance-btn--ghost endurance-btn--xs"
                    disabled={drivers.length <= 1}
                    onClick={() => removeDriver(index)}
                  >
                    Suppr.
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
