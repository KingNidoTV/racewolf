import { useMemo } from "react";
import { useEnduranceOverlayPlan } from "../../hooks/useEnduranceOverlayPlan";
import type { StrategyLive } from "../../types/strategy";
import { buildEnduranceRaceStrategyView } from "../../utils/enduranceRaceStrategyView";

interface Props {
  live: StrategyLive;
}

export function StrategyRaceBar({ live }: Props) {
  const plan = useEnduranceOverlayPlan();
  const view = useMemo(
    () => buildEnduranceRaceStrategyView(plan, live),
    [plan, live],
  );

  return (
    <div className="strategy-race-bar panel" aria-label="Stratégie course">
      <div className="strategy-race-bar__item">
        <span className="strategy-race-bar__label">Relais</span>
        <span className="strategy-race-bar__value">{view.stintLabel}</span>
      </div>
      <div className="strategy-race-bar__item">
        <span className="strategy-race-bar__label">Tours</span>
        <span className="strategy-race-bar__value">{view.lapsLabel}</span>
      </div>
      <div className="strategy-race-bar__item">
        <span className="strategy-race-bar__label">Temps</span>
        <span className="strategy-race-bar__value">{view.timeOnTrack}</span>
      </div>
      <div className="strategy-race-bar__item">
        <span className="strategy-race-bar__label">Prochain pilote</span>
        <span className="strategy-race-bar__value strategy-race-bar__value--driver">
          {view.nextDriver}
        </span>
      </div>
      <div className="strategy-race-bar__item">
        <span className="strategy-race-bar__label">Fenêtre pits</span>
        <span className="strategy-race-bar__value strategy-race-bar__value--pit">
          {view.pitWindow}
        </span>
      </div>
    </div>
  );
}
