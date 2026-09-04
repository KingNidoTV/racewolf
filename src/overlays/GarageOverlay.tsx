import { useState } from "react";
import { EyeIcon } from "../components/icons/EyeIcon";
import { GarageStandingsTable } from "../components/standings/GarageStandingsTable";
import { StintLapsPanel } from "../components/garage/StintLapsPanel";
import { TireWearPanel } from "../components/garage/TireWearPanel";
import { WeatherPanel } from "../components/garage/WeatherPanel";
import type { GarageTelemetry } from "../types/telemetry";
import "../styles/overlays.css";

interface Props {
  data: GarageTelemetry;
}

export function GarageOverlay({ data }: Props) {
  const [overlayHidden, setOverlayHidden] = useState(false);

  if (overlayHidden) {
    return (
      <div className="garage-overlay garage-overlay--hidden-ui">
        <button
          type="button"
          className="garage-overlay__restore"
          data-ath-interactive
          onClick={() => setOverlayHidden(false)}
          title="Afficher l'overlay garage"
          aria-label="Afficher l'overlay garage"
        >
          <EyeIcon size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="garage-overlay">
      <div
        className="garage-overlay__band garage-overlay__band--top"
        aria-hidden
      />
      <div className="garage-overlay__center">
        <div className="garage-overlay__layout">
          <aside className="garage-overlay__side">
            <WeatherPanel weather={data.weather} />
            <StintLapsPanel summary={data.stintLaps} />
            <TireWearPanel wear={data.tireWear} />
          </aside>

          <div className="garage-overlay__main-col">
            <div className="garage-standings-panel" data-ath-interactive>
              <div className="garage-standings-panel__header">
                <h2 className="garage-standings-panel__title">
                  {data.isStartingGrid
                    ? "Grille de départ"
                    : "Classement — garage"}
                </h2>
                <div className="garage-standings-panel__actions">
                  <button
                    type="button"
                    className="garage-standings-panel__toggle"
                    onClick={() => setOverlayHidden(true)}
                    title="Masquer tout l'overlay"
                    aria-label="Masquer tout l'overlay"
                  >
                    <EyeIcon size={16} />
                  </button>
                </div>
              </div>

              <div className="garage-standings-panel__body">
                {data.rows.length > 0 ? (
                  <div className="garage-standings-panel__scroll">
                    <GarageStandingsTable
                      rows={data.rows}
                      sectorCount={data.sectorCount}
                    />
                  </div>
                ) : (
                  <p className="garage-standings-panel__empty">
                    Aucune donnée classement (en attente du SDK iRacing).
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="garage-overlay__band garage-overlay__band--bottom"
        aria-hidden
      />
    </div>
  );
}
