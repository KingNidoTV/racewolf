import type { Driver, Stint, Strategy } from "../../models";
import { formatSecondsToClock } from "../../engine";
import { EnduranceMenuSelect } from "./EnduranceMenuSelect";

interface Props {
  drivers: Driver[];
  strategy: Strategy;
  showHeader?: boolean;
  editable?: boolean;
  onRelaisChange?: (relais: Stint[]) => void;
}

function driverById(drivers: Driver[], id: string): Driver | undefined {
  return drivers.find((d) => d.id === id);
}

function formatDureeResume(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m} min`;
}

function objectifLabel(objectif: Strategy["objectif"]): string {
  return objectif === "max_tours"
    ? "Maximiser les tours"
    : "Terminer le plus vite";
}

function compterChangementsPneus(relais: Stint[]): number {
  return relais.filter((r) => r.changementPneus).length;
}

function createBlankStint(
  drivers: Driver[],
  previous: Stint | undefined,
  numero: number,
): Stint {
  const other = drivers.find((d) => d.id !== previous?.piloteId);
  const piloteId = other?.id ?? previous?.piloteId ?? drivers[0]?.id ?? "";
  return {
    numero,
    heureDebut: previous?.heureFin ?? "00:00:00",
    heureFin: previous?.heureFin ?? "00:00:00",
    piloteId,
    toursPrevus: previous?.toursPrevus ?? 10,
    dureeSecondes: previous?.dureeSecondes ?? 0,
    carburantUtiliseLitres: 0,
    toursMaxCarburant: previous?.toursMaxCarburant ?? 0,
    changementPneus: true,
  };
}

export function StrategyResults({
  drivers,
  strategy,
  showHeader = true,
  editable = false,
  onRelaisChange,
}: Props) {
  const changementsPneus = compterChangementsPneus(strategy.relais);

  const patchStint = (index: number, patch: Partial<Stint>) => {
    if (!onRelaisChange) return;
    const relais = strategy.relais.map((stint, i) =>
      i === index ? { ...stint, ...patch } : stint,
    );
    onRelaisChange(relais);
  };

  const addStint = () => {
    if (!onRelaisChange || drivers.length === 0) return;
    const last = strategy.relais[strategy.relais.length - 1];
    const next = createBlankStint(drivers, last, strategy.relais.length + 1);
    onRelaisChange([...strategy.relais, next]);
  };

  const removeStint = (index: number) => {
    if (!onRelaisChange || strategy.relais.length <= 1) return;
    onRelaisChange(
      strategy.relais
        .filter((_, i) => i !== index)
        .map((stint, i) => ({ ...stint, numero: i + 1 })),
    );
  };

  return (
    <section className="endurance-page endurance-page--results">
      {showHeader ? (
        <header className="endurance-page__header">
          <h2>Stratégie générée</h2>
          <div className="endurance-summary">
            <span>
              <strong>{strategy.nombreRelaisTotal}</strong> relais —{" "}
              <strong>
                {strategy.toursTotaux ??
                  strategy.relais.reduce((s, r) => s + r.toursPrevus, 0)}
              </strong>{" "}
              tours
            </span>
            {strategy.dureeTotaleSecondes ? (
              <span className="endurance-summary__meta">
                Durée estimée : {formatDureeResume(strategy.dureeTotaleSecondes)}
              </span>
            ) : null}
            {strategy.carburantTotalLitres != null &&
            strategy.carburantTotalLitres > 0 ? (
              <span className="endurance-summary__meta">
                Carburant : {strategy.carburantTotalLitres.toFixed(1)} L
              </span>
            ) : null}
            {changementsPneus > 0 ? (
              <span className="endurance-summary__meta">
                Pneus : {changementsPneus} changement
                {changementsPneus > 1 ? "s" : ""}
              </span>
            ) : null}
            {strategy.objectif ? (
              <span className="endurance-summary__meta">
                {objectifLabel(strategy.objectif)}
              </span>
            ) : null}
            {strategy.genereLe ? (
              <span className="endurance-summary__meta">
                Généré le {new Date(strategy.genereLe).toLocaleString("fr-FR")}
              </span>
            ) : null}
          </div>
        </header>
      ) : (
        <div className="endurance-summary endurance-summary--inline">
          <span>
            <strong>{strategy.nombreRelaisTotal}</strong> relais —{" "}
            <strong>
              {strategy.toursTotaux ??
                strategy.relais.reduce((s, r) => s + r.toursPrevus, 0)}
            </strong>{" "}
            tours
          </span>
          {strategy.dureeTotaleSecondes ? (
            <span className="endurance-summary__meta">
              Durée estimée : {formatDureeResume(strategy.dureeTotaleSecondes)}
            </span>
          ) : null}
          {strategy.carburantTotalLitres != null &&
          strategy.carburantTotalLitres > 0 ? (
            <span className="endurance-summary__meta">
              Carburant : {strategy.carburantTotalLitres.toFixed(1)} L
            </span>
          ) : null}
          {changementsPneus > 0 ? (
            <span className="endurance-summary__meta">
              Pneus : {changementsPneus} changement
              {changementsPneus > 1 ? "s" : ""}
            </span>
          ) : null}
          {strategy.objectif ? (
            <span className="endurance-summary__meta">
              {objectifLabel(strategy.objectif)}
            </span>
          ) : null}
          {strategy.genereLe ? (
            <span className="endurance-summary__meta">
              Généré le {new Date(strategy.genereLe).toLocaleString("fr-FR")}
            </span>
          ) : null}
        </div>
      )}

      {strategy.avertissements.length > 0 ? (
        <ul className="endurance-warnings">
          {strategy.avertissements.map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      ) : null}

      {editable ? (
        <div className="endurance-strategy-toolbar">
          <p className="endurance-strategy-hint">
            Modifiez pilote, tours ou pneus — la stratégie est recalculée
            automatiquement.
          </p>
          <button
            type="button"
            className="endurance-btn endurance-btn--ghost"
            onClick={addStint}
            disabled={drivers.length === 0}
          >
            + Ajouter un stint
          </button>
        </div>
      ) : null}

      <div className="endurance-table-wrap">
        <table className="endurance-table endurance-table--strategy">
          <thead>
            <tr>
              <th>Stint</th>
              <th>Heure début</th>
              <th>Heure fin</th>
              <th>Pilote</th>
              <th>Tours prévus</th>
              <th>Carburant</th>
              <th>Pneus</th>
              <th>Durée du relais</th>
              {editable ? <th aria-label="Actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {strategy.relais.map((stint, index) => {
              const pilote = driverById(drivers, stint.piloteId);
              return (
                <tr key={`${stint.numero}-${index}`}>
                  <td>{stint.numero}</td>
                  <td>{stint.heureDebut}</td>
                  <td>{stint.heureFin}</td>
                  <td>
                    {editable ? (
                      <EnduranceMenuSelect
                        className="endurance-table__menu"
                        value={stint.piloteId}
                        placeholder="Pilote…"
                        includeEmptyOption={false}
                        options={drivers.map((d) => ({
                          value: d.id,
                          label: d.nom,
                        }))}
                        onChange={(piloteId) =>
                          patchStint(index, { piloteId })
                        }
                      />
                    ) : (
                      <span className="endurance-pilot">
                        <span
                          className="endurance-pilot__dot"
                          style={{ background: pilote?.couleur ?? "#666" }}
                        />
                        {pilote?.nom ?? "—"}
                      </span>
                    )}
                  </td>
                  <td>
                    {editable ? (
                      <input
                        type="number"
                        className="endurance-table__input endurance-table__input--num"
                        min={1}
                        step={1}
                        value={stint.toursPrevus}
                        onChange={(e) =>
                          patchStint(index, {
                            toursPrevus: Math.max(
                              1,
                              Number(e.target.value) || 1,
                            ),
                          })
                        }
                      />
                    ) : (
                      stint.toursPrevus
                    )}
                  </td>
                  <td>
                    {stint.carburantUtiliseLitres != null &&
                    stint.carburantUtiliseLitres > 0
                      ? `${stint.carburantUtiliseLitres.toFixed(1)} L`
                      : "—"}
                    {stint.toursMaxCarburant != null &&
                    stint.toursMaxCarburant > 0 ? (
                      <span className="endurance-table__sub">
                        max {stint.toursMaxCarburant} t.
                      </span>
                    ) : null}
                  </td>
                  <td className="endurance-table__center">
                    {editable ? (
                      <input
                        type="checkbox"
                        className="endurance-table__checkbox"
                        checked={stint.changementPneus}
                        title="Changement de pneus au début de ce relais"
                        onChange={(e) =>
                          patchStint(index, {
                            changementPneus: e.target.checked,
                          })
                        }
                      />
                    ) : stint.changementPneus ? (
                      "Oui"
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatSecondsToClock(stint.dureeSecondes)}</td>
                  {editable ? (
                    <td>
                      <button
                        type="button"
                        className="endurance-btn endurance-btn--ghost endurance-btn--xs"
                        onClick={() => removeStint(index)}
                        disabled={strategy.relais.length <= 1}
                        title="Supprimer ce stint"
                      >
                        ✕
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
