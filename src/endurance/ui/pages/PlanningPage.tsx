import { useEffect, useRef } from "react";
import type { Driver, EndurancePlan } from "../../models";
import type { EnduranceLiveSession } from "../../models/LiveSession";
import { formatRaceDuration } from "../../models";
import { DriversPage } from "./DriversPage";
import { RaceSettingsPage } from "./RaceSettingsPage";
import { TiresPage } from "./TiresPage";

export type SetupSectionId = "race" | "drivers" | "tires";

interface Props {
  plan: EndurancePlan;
  live: EnduranceLiveSession;
  section: SetupSectionId;
  readOnly?: boolean;
  onRaceSettingsChange: (settings: EndurancePlan["raceSettings"]) => void;
  onDriversChange: (drivers: Driver[]) => void;
  onGenerate: () => void;
}

export function PlanningPage({
  plan,
  live,
  section,
  readOnly = false,
  onRaceSettingsChange,
  onDriversChange,
  onGenerate,
}: Props) {
  const raceRef = useRef<HTMLElement>(null);
  const driversRef = useRef<HTMLElement>(null);
  const tiresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const map = {
      race: raceRef,
      drivers: driversRef,
      tires: tiresRef,
    } as const;
    map[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  return (
    <div className="endurance-planning">
      <fieldset className="endurance-fieldset" disabled={readOnly}>
        <section
          ref={raceRef}
          className="endurance-planning__section"
          id="endurance-setup-race"
        >
          <RaceSettingsPage
            settings={plan.raceSettings}
            live={live}
            onChange={onRaceSettingsChange}
          />
        </section>

        <section
          ref={driversRef}
          className="endurance-planning__section"
          id="endurance-setup-drivers"
        >
          <DriversPage
            drivers={plan.drivers}
            live={live}
            onChange={onDriversChange}
          />
        </section>

        <section
          ref={tiresRef}
          className="endurance-planning__section"
          id="endurance-setup-tires"
        >
          <TiresPage
            settings={plan.raceSettings}
            onChange={onRaceSettingsChange}
          />
        </section>
      </fieldset>

      {readOnly ? (
        <p className="endurance-collab-readonly">
          Préparation en lecture seule — seul l&apos;hôte peut modifier la
          configuration.
        </p>
      ) : null}

      <div className="endurance-strategy-action">
        <div className="endurance-strategy-action__text">
          <strong>Générer la stratégie</strong>
          <span>
            Course de {formatRaceDuration(plan.raceSettings)} —{" "}
            {plan.drivers.length} pilote{plan.drivers.length > 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          className="endurance-btn endurance-btn--primary endurance-btn--lg"
          onClick={onGenerate}
          disabled={readOnly}
        >
          Générer la stratégie
        </button>
      </div>
    </div>
  );
}
