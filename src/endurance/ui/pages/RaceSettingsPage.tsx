import type { RaceSettings } from "../../models";
import type { EnduranceLiveSession } from "../../models/LiveSession";
import {
  IRACING_CARS,
  IRACING_TRACKS,
  findCarEntry,
  findCatalogEntry,
} from "../../data/catalog";
import { formatSecondsToClock, parseClockToSeconds } from "../../engine";
import { CatalogSelect } from "../components/CatalogSelect";
import { TrackSelect } from "../components/TrackSelect";

interface Props {
  settings: RaceSettings;
  live: EnduranceLiveSession;
  onChange: (settings: RaceSettings) => void;
}

function durationFields(minutes: number): { hours: number; mins: number } {
  return {
    hours: Math.floor(minutes / 60),
    mins: minutes % 60,
  };
}

export function RaceSettingsPage({ settings, live, onChange }: Props) {
  const { hours, mins } = durationFields(settings.durationMinutes);
  const liveConnected = live.connected;
  const livePractice = live.isPractice;
  const liveSessionType = live.sessionType;
  const measuredPitStops = live.measuredPitStops;

  const patch = (partial: Partial<RaceSettings>) =>
    onChange({ ...settings, ...partial });

  const setDuration = (h: number, m: number) => {
    patch({ durationMinutes: Math.max(1, h * 60 + m) });
  };

  const selectedTrack = findCatalogEntry(IRACING_TRACKS, settings.circuitId);
  const selectedCar = settings.voitureId
    ? findCarEntry(settings.voitureId)
    : undefined;

  return (
    <section className="endurance-page">
      <header className="endurance-page__header">
        <h2>Paramètres de course</h2>
        <p>Informations de base pour planifier la stratégie d&apos;endurance.</p>
      </header>

      <form className="endurance-form" onSubmit={(e) => e.preventDefault()}>
        <div className="endurance-form__grid">
          <div className="endurance-field endurance-field--span2 endurance-course-row">
            <label className="endurance-course-row__field">
              <span>Date</span>
              <input
                type="date"
                value={settings.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </label>

            <label className="endurance-course-row__field">
              <span>Heure de départ</span>
              <input
                type="time"
                value={settings.startTime}
                onChange={(e) => patch({ startTime: e.target.value })}
              />
            </label>

            <div className="endurance-course-row__duration">
              <div className="endurance-toggle" role="group" aria-label="Durée">
                <button
                  type="button"
                  className={[
                    "endurance-toggle__btn",
                    settings.dureeType === "time"
                      ? "endurance-toggle__btn--active"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => patch({ dureeType: "time" })}
                >
                  Temps
                </button>
                <button
                  type="button"
                  className={[
                    "endurance-toggle__btn",
                    settings.dureeType === "laps"
                      ? "endurance-toggle__btn--active"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => patch({ dureeType: "laps" })}
                >
                  Tours
                </button>
              </div>

              {settings.dureeType === "time" ? (
                <label className="endurance-course-row__field">
                  <span>Durée de course</span>
                  <div className="endurance-field__inline">
                    <input
                      type="number"
                      min={0}
                      max={48}
                      value={hours}
                      onChange={(e) =>
                        setDuration(
                          Number.parseInt(e.target.value, 10) || 0,
                          mins,
                        )
                      }
                    />
                    <span className="endurance-field__unit">h</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={mins}
                      onChange={(e) =>
                        setDuration(
                          hours,
                          Number.parseInt(e.target.value, 10) || 0,
                        )
                      }
                    />
                    <span className="endurance-field__unit">min</span>
                  </div>
                </label>
              ) : (
                <label className="endurance-course-row__field">
                  <span>Nombre de tours</span>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={settings.durationLaps}
                    onChange={(e) =>
                      patch({
                        durationLaps: Number.parseInt(e.target.value, 10) || 1,
                      })
                    }
                  />
                </label>
              )}
            </div>
          </div>

          <div className="endurance-field endurance-field--span2 endurance-field--voiture-reservoir">
            <div className="endurance-voiture-reservoir">
              <div className="endurance-voiture-reservoir__main">
                <label className="endurance-voiture-reservoir__field">
                  <span>Voiture</span>
                  <CatalogSelect
                    options={IRACING_CARS}
                    valueId={settings.voitureId}
                    placeholder="Choisir une voiture…"
                    onChange={(id, label) => {
                      const car = findCarEntry(id);
                      patch({
                        voitureId: id,
                        voiture: label,
                        ...(car
                          ? {
                              capaciteReservoirLitres:
                                car.capaciteReservoirLitres,
                              capaciteReservoirEstimee: true,
                            }
                          : {}),
                      });
                    }}
                  />
                  {selectedCar && settings.voiture !== selectedCar.label ? (
                    <span className="endurance-field__hint">{settings.voiture}</span>
                  ) : null}
                </label>

                <label className="endurance-voiture-reservoir__field">
                  <span>Circuit</span>
                  <TrackSelect
                    valueId={settings.circuitId}
                    placeholder="Choisir un circuit…"
                    onChange={(id, label) =>
                      patch({ circuitId: id, circuit: label })
                    }
                  />
                  {selectedTrack && settings.circuit !== selectedTrack.label ? (
                    <span className="endurance-field__hint">{settings.circuit}</span>
                  ) : null}
                </label>

                <div className="endurance-voiture-reservoir__pit">
                  <span>Temps moyen de pit</span>
                  <div className="endurance-voiture-reservoir__tank-control">
                    <input
                      className="endurance-table__input endurance-table__input--lap"
                      value={formatSecondsToClock(settings.tempsPitMoyenSecondes)}
                      onChange={(e) =>
                        patch({
                          tempsPitMoyenSecondes: parseClockToSeconds(
                            e.target.value,
                          ),
                          tempsPitEstime: false,
                        })
                      }
                    />
                    {settings.tempsPitEstime ? (
                      <span className="endurance-pit-readout__badge">estimé</span>
                    ) : (
                      <span className="endurance-pit-readout__badge endurance-pit-readout__badge--ok">
                        mesuré
                      </span>
                    )}
                  </div>
                  <p className="endurance-field__help">
                    {liveConnected && livePractice ? (
                      <>
                        Saisie manuelle ou mesure en practice iRacing
                        {measuredPitStops > 0
                          ? ` (${measuredPitStops} arrêt${measuredPitStops > 1 ? "s" : ""})`
                          : ""}
                        .
                      </>
                    ) : liveConnected ? (
                      <>
                        Session détectée ({liveSessionType ?? "—"}) — saisissez
                        le temps ou lancez une practice pour le mesurer.
                      </>
                    ) : (
                      <>
                        Saisissez le temps pit (M:SS) ou lancez iRacing en
                        practice pour une mesure automatique.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <label className="endurance-voiture-reservoir__tank">
                <span>Réservoir (L)</span>
                <div className="endurance-voiture-reservoir__tank-control">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    step={0.5}
                    value={settings.capaciteReservoirLitres}
                    onChange={(e) =>
                      patch({
                        capaciteReservoirLitres:
                          Number.parseFloat(e.target.value) || 100,
                        capaciteReservoirEstimee: false,
                      })
                    }
                  />
                  {settings.capaciteReservoirEstimee ? (
                    <span className="endurance-pit-readout__badge">estimé</span>
                  ) : (
                    <span className="endurance-pit-readout__badge endurance-pit-readout__badge--ok">
                      mesuré
                    </span>
                  )}
                </div>
              </label>
            </div>
            <p className="endurance-field__help">
              {liveConnected && livePractice ? (
                <>
                  Réservoir catalogue ou mesure practice iRacing
                  {live.capaciteReservoirLitres > 0
                    ? ` — max ${live.capaciteReservoirLitres} L`
                    : ""}
                  .
                </>
              ) : (
                <>
                  Le réservoir se remplit selon la voiture choisie ; vous pouvez
                  le modifier. En practice, la capacité réelle peut être lue
                  depuis iRacing.
                </>
              )}
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}
