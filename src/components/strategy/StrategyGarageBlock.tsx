import { StrategyDriverSetup } from "./StrategyDriverSetup";
import { StrategyRaceMeta } from "./StrategyRaceMeta";
import { StrategyStintTable } from "./StrategyStintTable";
import type { StrategyPlan } from "../../types/strategy";

interface Props {
  plan: StrategyPlan;
  onDriverCountChange: (n: number) => void;
  onDriversChange: (drivers: StrategyPlan["drivers"]) => void;
  onRegenerate: () => void;
  onStintDriverChange: (stintIndex: number, driverId: string) => void;
  remarks: string;
  onRemarksChange: (text: string) => void;
  /** Intégré dans le panneau classement (sans titre ni cadre). */
  embedded?: boolean;
}

export function StrategyGarageBlock({
  plan,
  onDriverCountChange,
  onDriversChange,
  onRegenerate,
  onStintDriverChange,
  remarks,
  onRemarksChange,
  embedded = false,
}: Props) {
  return (
    <section
      className={
        embedded
          ? "strategy-garage-block strategy-garage-block--embedded"
          : "strategy-garage-block"
      }
      data-ath-interactive
    >
      {!embedded ? (
        <h2 className="strategy-garage-block__title">Stratégie de course</h2>
      ) : null}
      <div className="strategy-garage-block__top">
        <StrategyRaceMeta session={plan.session} />
        <StrategyDriverSetup
          drivers={plan.drivers}
          onDriverCountChange={onDriverCountChange}
          onDriversChange={onDriversChange}
          onRegenerate={onRegenerate}
        />
      </div>
      <StrategyStintTable
        plan={plan}
        editableDrivers
        onDriverChange={onStintDriverChange}
      />
      <label className="strategy-remarks">
        <span>Remarque</span>
        <textarea
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          rows={2}
          placeholder="Notes stratégie…"
        />
      </label>
    </section>
  );
}
