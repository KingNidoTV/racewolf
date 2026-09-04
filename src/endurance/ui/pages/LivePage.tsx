import type { EndurancePlan } from "../../models";
import type { LiveRaceSnapshot } from "../../live/models";
import type {
  BoxCallState,
  RadioPresetId,
} from "../../collaboration/types";
import { LiveSessionBanner } from "../components/LiveSessionBanner";
import { LiveStrategyTable } from "../components/LiveStrategyTable";
import { LiveRecentLaps } from "../components/LiveRecentLaps";
import { LiveFuelCard } from "../components/LiveFuelCard";
import { BoxCallPanel } from "../components/BoxCallPanel";

interface Props {
  plan: EndurancePlan;
  onBack: () => void;
  boxCall: BoxCallState;
  onSendRadio: (message: string, preset: RadioPresetId) => void;
  onClearRadio: () => void;
  snapshot: LiveRaceSnapshot;
}

export function LivePage({
  plan,
  onBack,
  boxCall,
  onSendRadio,
  onClearRadio,
  snapshot,
}: Props) {
  const { session, stint, strategy: liveStrategy, fuel } = snapshot;

  const relaisProjete = liveStrategy.relaisProjete;
  const currentStint =
    stint.numeroRelais > 0
      ? stint.numeroRelais
      : liveStrategy.relaisActuel;

  const activeRelais = relaisProjete.find((r) => r.numero === currentStint);
  const toursPrevus = activeRelais?.toursPrevus ?? 0;
  const toursRestants =
    toursPrevus > 0
      ? Math.max(0, toursPrevus - stint.toursCompletes)
      : null;
  const suggestPit =
    !stint.enPit &&
    toursRestants != null &&
    toursRestants <= 3 &&
    toursPrevus > 0;

  return (
    <div className="endurance-live-page">
      <header className="endurance-page__header endurance-page__header--row">
        <div>
          <h2>Mode Live</h2>
          <p>{plan.raceSettings.circuit || "Course"}</p>
        </div>
        <button
          type="button"
          className="endurance-btn endurance-btn--ghost"
          onClick={onBack}
        >
          ← Stratégie
        </button>
      </header>

      <LiveSessionBanner session={session} />

      <LiveFuelCard fuel={fuel} />

      <BoxCallPanel
        boxCall={boxCall}
        onSend={onSendRadio}
        onClear={onClearRadio}
        suggestPit={suggestPit}
        toursRestants={toursRestants}
      />

      <LiveRecentLaps stint={stint} drivers={plan.drivers} />

      <LiveStrategyTable
        drivers={plan.drivers}
        relais={relaisProjete}
        avertissements={liveStrategy.avertissements}
        currentStintNumero={currentStint}
        toursCompletesActuel={stint.toursCompletes}
        enPit={stint.enPit}
      />
    </div>
  );
}
