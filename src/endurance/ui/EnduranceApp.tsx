import {
  useEndurancePlan,
  type EndurancePageId,
} from "../hooks/useEndurancePlan";
import { useState } from "react";
import {
  PlanningPage,
  type SetupSectionId,
} from "./pages/PlanningPage";
import { StrategyPage } from "./pages/StrategyPage";
import { LivePage } from "./pages/LivePage";
import { CollaborationPanel } from "./components/CollaborationPanel";
import { useLiveRace } from "../hooks/useLiveRace";
import "../endurance.css";

const SETUP_SECTIONS: { id: SetupSectionId; label: string }[] = [
  { id: "race", label: "Course" },
  { id: "drivers", label: "Pilotes" },
  { id: "tires", label: "Pneus" },
];

const MAIN_NAV: { id: EndurancePageId; label: string }[] = [
  { id: "strategy", label: "Stratégie" },
  { id: "live", label: "Live" },
];

interface Props {
  /** Intégré dans le launcher (bouton retour). */
  embedded?: boolean;
  onBack?: () => void;
}

export function EnduranceApp({ embedded = false, onBack }: Props) {
  const {
    plan,
    page,
    setPage,
    loading,
    saving,
    live,
    setRaceSettings,
    setDrivers,
    generate,
    updateStrategyRelais,
    validateStrategy,
    exportStrategyPdf,
    collab,
    editSetup,
    editStrategy,
  } = useEndurancePlan();
  const [exporting, setExporting] = useState(false);
  const [setupSection, setSetupSection] = useState<SetupSectionId>("race");
  const { snapshot: liveRaceSnapshot } = useLiveRace(
    plan,
    Boolean(plan?.strategyValidatedAt),
  );
  const handleExportPdf = () => {
    setExporting(true);
    void exportStrategyPdf().finally(() => setExporting(false));
  };

  const goToSetup = (section: SetupSectionId) => {
    setSetupSection(section);
    setPage("setup");
  };

  if (loading || !plan) {
    return (
      <div className="endurance-app endurance-app--loading">
        Chargement du plan de course…
      </div>
    );
  }

  return (
    <div
      className={[
        "endurance-app",
        embedded ? "endurance-app--embedded" : null,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <aside className="endurance-sidebar">
        <div className="endurance-sidebar__brand">
          <div className="endurance-sidebar__logo-wrap">
            <img
              className="endurance-sidebar__logo-img"
              src="./assets/racewolf-logo.png"
              alt=""
              width={40}
              height={40}
            />
          </div>
          <div>
            <strong>RaceWolf</strong>
            <span>Pit Crew</span>
          </div>
        </div>

        {embedded && onBack ? (
          <button
            type="button"
            className="endurance-nav__item endurance-nav__item--back"
            onClick={onBack}
          >
            ← Retour launcher
          </button>
        ) : null}

        <nav className="endurance-nav">
          <div className="endurance-nav__group">
            <button
              type="button"
              className={[
                "endurance-nav__item",
                "endurance-nav__item--group",
                page === "setup" ? "endurance-nav__item--active" : null,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => goToSetup(setupSection)}
            >
              Préparation
            </button>
            <div className="endurance-nav__sub">
              {SETUP_SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    "endurance-nav__subitem",
                    page === "setup" && setupSection === item.id
                      ? "endurance-nav__subitem--active"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => goToSetup(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {MAIN_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={[
                "endurance-nav__item",
                page === item.id ? "endurance-nav__item--active" : null,
                item.id === "strategy" && !plan.strategy
                  ? "endurance-nav__item--disabled"
                  : null,
                item.id === "live" && !plan.strategyValidatedAt
                  ? "endurance-nav__item--disabled"
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={
                (item.id === "strategy" && !plan.strategy) ||
                (item.id === "live" && !plan.strategyValidatedAt)
              }
              onClick={() => setPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <CollaborationPanel
          session={collab.session}
          hostInfo={collab.hostInfo}
          onStartHost={(relayUrl, hostName) =>
            void collab.startHostRemote(relayUrl, hostName)
          }
          onJoin={(roomCode, name, role, relayUrl) =>
            void collab.joinRemote(roomCode, name, role, relayUrl)
          }
          onLeave={() => void collab.leaveSession()}
        />

        <footer className="endurance-sidebar__footer">
          <p className="endurance-sidebar__hint">
            Course, pilotes et pneus sur une page — onglets pour naviguer.
          </p>
          {saving ? (
            <span className="endurance-sidebar__save">Sauvegarde…</span>
          ) : (
            <span className="endurance-sidebar__save endurance-sidebar__save--ok">
              Sauvegardé
            </span>
          )}
        </footer>
      </aside>

      <main className="endurance-main">
        {page === "setup" ? (
          <PlanningPage
            plan={plan}
            live={live}
            section={setupSection}
            readOnly={!editSetup}
            onRaceSettingsChange={setRaceSettings}
            onDriversChange={setDrivers}
            onGenerate={generate}
          />
        ) : null}
        {page === "strategy" ? (
          <StrategyPage
            plan={plan}
            canEdit={editStrategy}
            canManage={editSetup}
            onBack={() => setPage("setup")}
            onRegenerate={generate}
            onRelaisChange={updateStrategyRelais}
            onValidate={validateStrategy}
            onExportPdf={handleExportPdf}
            exporting={exporting}
          />
        ) : null}
        {page === "live" && plan.strategyValidatedAt ? (
          <LivePage
            plan={plan}
            snapshot={liveRaceSnapshot}
            onBack={() => setPage("strategy")}
            boxCall={collab.boxCall}
            onSendRadio={collab.sendRadio}
            onClearRadio={collab.clearRadio}
          />
        ) : null}
      </main>
    </div>
  );
}
