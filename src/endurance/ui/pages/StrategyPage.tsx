import type { EndurancePlan, Stint } from "../../models";
import { formatRaceDuration } from "../../models";
import { getStrategyLiveReadiness } from "../../engine";
import { StrategyResults } from "../components/StrategyResults";

interface Props {
  plan: EndurancePlan;
  canEdit?: boolean;
  canManage?: boolean;
  onBack: () => void;
  onRegenerate: () => void;
  onRelaisChange: (relais: Stint[]) => void;
  onValidate: () => void;
  onExportPdf: () => void;
  exporting?: boolean;
}

export function StrategyPage({
  plan,
  canEdit = true,
  canManage = true,
  onBack,
  onRegenerate,
  onRelaisChange,
  onValidate,
  onExportPdf,
  exporting = false,
}: Props) {
  const { strategy, drivers, raceSettings } = plan;
  const validated = Boolean(plan.strategyValidatedAt);
  const readiness = getStrategyLiveReadiness(raceSettings, strategy);
  const canValidate = canManage && readiness.ok;

  return (
    <div className="endurance-strategy-page">
      <header className="endurance-page__header endurance-page__header--row">
        <div>
          <h2>Stratégie</h2>
          <p>
            Course de {formatRaceDuration(raceSettings)}
            {raceSettings.circuit ? ` — ${raceSettings.circuit}` : ""}
          </p>
        </div>
        <div className="endurance-strategy-page__actions">
          <button
            type="button"
            className="endurance-btn endurance-btn--ghost"
            onClick={onBack}
          >
            ← Préparation
          </button>
          <button
            type="button"
            className="endurance-btn endurance-btn--primary"
            onClick={onRegenerate}
            disabled={!canManage}
          >
            Régénérer
          </button>
        </div>
      </header>

      {!strategy ? (
        <p className="endurance-empty">
          Aucune stratégie générée. Retournez à la préparation pour configurer
          la course et lancer la génération.
        </p>
      ) : (
        <>
          {validated ? (
            <p className="endurance-strategy-validated">
              Stratégie validée le{" "}
              {new Date(plan.strategyValidatedAt!).toLocaleString("fr-FR")} —
              accessible dans l’onglet Live.
            </p>
          ) : null}
          {!readiness.ok && readiness.reason ? (
            <p className="endurance-strategy-time-note">{readiness.reason}</p>
          ) : null}
          {!canEdit ? (
            <p className="endurance-collab-readonly">
              Stratégie en lecture seule — demandez le rôle éditeur pour
              modifier les relais.
            </p>
          ) : null}
          <StrategyResults
            drivers={drivers}
            strategy={strategy}
            showHeader={false}
            editable={canEdit}
            onRelaisChange={onRelaisChange}
          />
          <footer className="endurance-strategy-footer">
            <button
              type="button"
              className="endurance-btn endurance-btn--primary endurance-btn--lg"
              onClick={onValidate}
              disabled={!canValidate}
              title={readiness.reason ?? undefined}
            >
              Validé
            </button>
            <button
              type="button"
              className="endurance-btn endurance-btn--ghost endurance-btn--lg"
              onClick={onExportPdf}
              disabled={exporting}
            >
              {exporting ? "Export…" : "Exporter en PDF"}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
