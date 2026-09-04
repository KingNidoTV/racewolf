import type { LiveSession } from "../../live/models";

interface Props {
  session: LiveSession;
}

function formatSessionTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatTemp(c: number | null): string {
  if (c == null || c <= 0) return "—";
  return `${c} °C`;
}

export function LiveSessionBanner({ session }: Props) {
  const tempsRestant =
    session.sessionTimeRemainingSec != null
      ? formatSessionTime(session.sessionTimeRemainingSec)
      : "—";

  const connected = session.connected;
  const statusLabel = connected
    ? `Connecté (${session.source})`
    : session.iracingRunning
      ? "Connexion iRacing…"
      : "En attente télémétrie";

  return (
    <section className="endurance-live-banner">
      <div className="endurance-live-banner__status">
        <span
          className={[
            "endurance-live-badge",
            connected
              ? "endurance-live-badge--ok"
              : "endurance-live-badge--off",
          ].join(" ")}
        >
          {statusLabel}
        </span>
        {session.error ? (
          <span className="endurance-live-status__hint">{session.error}</span>
        ) : null}
      </div>

      <div className="endurance-live-banner__grid">
        <div className="endurance-live-banner__item">
          <span className="endurance-live-banner__label">Session</span>
          <strong>{session.sessionType ?? "—"}</strong>
        </div>
        <div className="endurance-live-banner__item">
          <span className="endurance-live-banner__label">Heure in-game</span>
          <strong>{session.gameClock ?? "—"}</strong>
        </div>
        <div className="endurance-live-banner__item">
          <span className="endurance-live-banner__label">Temps restant</span>
          <strong>{tempsRestant}</strong>
        </div>
        <div className="endurance-live-banner__item endurance-live-banner__item--weather">
          <span className="endurance-live-banner__label">Météo</span>
          <strong>
            {session.cielLabel ?? "—"}
            {session.pisteHumiditeLabel ? (
              <span className="endurance-live-banner__sub">
                {" "}
                — {session.pisteHumiditeLabel}
              </span>
            ) : null}
          </strong>
        </div>
        <div className="endurance-live-banner__item">
          <span className="endurance-live-banner__label">Temp. air</span>
          <strong>{formatTemp(session.airTempCelsius)}</strong>
        </div>
        <div className="endurance-live-banner__item">
          <span className="endurance-live-banner__label">Temp. piste</span>
          <strong>{formatTemp(session.trackTempCelsius)}</strong>
        </div>
      </div>
    </section>
  );
}
