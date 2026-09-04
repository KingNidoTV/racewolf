import { useMemo } from "react";
import { TrackFlagBanner } from "../flags/TrackFlagBanner";
import type {
  SessionInfo,
  StandingsEntry,
  TrackFlagState,
} from "../../types/telemetry";
import { isPracticeOrQualifying } from "../../utils/sessionKind";
import { buildOtherClassStandings } from "../../utils/filterStandings";
import { StandingsList } from "./StandingsList";

interface Props {
  session: SessionInfo;
  standings: StandingsEntry[];
  trackFlag?: TrackFlagState | null;
  sectorCount?: number;
  topN?: number;
  ahead?: number;
  behind?: number;
  showOtherClasses?: boolean;
}

export function RaceStandingsPanel({
  session,
  standings,
  trackFlag = null,
  sectorCount = 3,
  topN = 10,
  ahead = 1,
  behind = 1,
  showOtherClasses = false,
}: Props) {
  const showSectorBars = isPracticeOrQualifying(session.sessionType);
  const progressPct = Math.round(
    Math.min(100, Math.max(0, (session.sessionProgress ?? 0) * 100)),
  );

  const raceOptions = useMemo(
    () => ({ topN, ahead, behind }),
    [topN, ahead, behind],
  );

  const otherClasses = useMemo(
    () =>
      showOtherClasses ? buildOtherClassStandings(standings, 1) : [],
    [standings, showOtherClasses],
  );

  return (
    <div className="panel race-standings-panel">
      <h2 className="race-standings-panel__series">{session.series}</h2>
      <p className="race-standings-panel__subtitle">
        {session.track} — {session.sessionType}
      </p>

      <div className="race-standings-panel__timer">
        <div className="race-standings-panel__timer-row">
          <span className="race-standings-panel__timer-label">
            Durée restante
          </span>
          <span className="race-standings-panel__timer-value">
            {session.timeRemaining}
          </span>
        </div>
        <div
          className="race-standings-panel__progress"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="race-standings-panel__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <TrackFlagBanner flag={trackFlag} />

      {!trackFlag ? (
        <h3 className="race-standings-panel__section">
          {session.isStartingGrid ? "Grille de départ" : "Classement"}
        </h3>
      ) : null}

      <StandingsList
        entries={standings}
        mode="race"
        showSectorBars={showSectorBars}
        sectorCount={sectorCount}
        raceOptions={raceOptions}
      />

      {otherClasses.map((group) => (
        <div key={group.classId} className="race-standings-panel__class">
          <h3 className="race-standings-panel__section">
            {group.className}
          </h3>
          <StandingsList
            entries={group.entries}
            mode="race"
            showSectorBars={showSectorBars}
            sectorCount={sectorCount}
            raceOptions={{ showAll: true }}
            classRankSource={standings}
          />
        </div>
      ))}
    </div>
  );
}
