import type { RaceSettings } from "../../models";

interface Props {
  settings: RaceSettings;
  onChange: (settings: RaceSettings) => void;
}

export function TiresPage({ settings, onChange }: Props) {
  const illimite = settings.trainsPneusIllimites;

  return (
    <section className="endurance-page">
      <header className="endurance-page__header">
        <h2>Gestion des pneus</h2>
        <p>
          Nombre de trains de pneus disponibles pour la course. Chaque relais
          avec changement de pneus consomme un train.
        </p>
      </header>

      <div className="endurance-form endurance-form--tires">
        <label className="endurance-field endurance-field--tires">
          <span>Trains de pneus</span>
          <div className="endurance-field__inline">
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              disabled={illimite}
              value={settings.nombreTrainsPneus}
              onChange={(e) => {
                const n = Math.max(1, Math.min(99, Number(e.target.value) || 1));
                onChange({ ...settings, nombreTrainsPneus: n });
              }}
            />
            <span className="endurance-field__unit">train{settings.nombreTrainsPneus > 1 ? "s" : ""}</span>
          </div>
        </label>

        <label className="endurance-field endurance-field--checkbox">
          <input
            type="checkbox"
            checked={illimite}
            onChange={(e) =>
              onChange({
                ...settings,
                trainsPneusIllimites: e.target.checked,
              })
            }
          />
          <span>Illimité</span>
        </label>
      </div>
    </section>
  );
}
