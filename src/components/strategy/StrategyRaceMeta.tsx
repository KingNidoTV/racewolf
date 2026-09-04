import type { StrategySessionInfo } from "../../types/strategy";
import { InfoHint } from "../ui/InfoHint";

interface Props {
  session: StrategySessionInfo;
}

const PIT_ESTIMATE_HINT =
  "Valeur par défaut (1 min 33 s). Effectuez au minimum 2 arrêts aux stands pour mesurer le temps pit réel.";

export function StrategyRaceMeta({ session }: Props) {
  return (
    <dl className="strategy-meta">
      <div>
        <dt>Date</dt>
        <dd>{session.date}</dd>
      </div>
      <div>
        <dt>Départ</dt>
        <dd>{session.startTime}</dd>
      </div>
      <div>
        <dt>Durée</dt>
        <dd>{session.duration}</dd>
      </div>
      <div>
        <dt>Voiture</dt>
        <dd>{session.car}</dd>
      </div>
      <div>
        <dt>Circuit</dt>
        <dd>{session.track}</dd>
      </div>
      <div className="strategy-meta__pit-row">
        <dt>Pit</dt>
        <dd className="strategy-meta__pit-value">
          <span>{session.pitTime}</span>
          {session.pitTimeEstimated ? (
            <InfoHint
              text={PIT_ESTIMATE_HINT}
              className="strategy-meta__pit-info"
            />
          ) : null}
        </dd>
      </div>
    </dl>
  );
}
