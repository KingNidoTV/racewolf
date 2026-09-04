import type { CSSProperties } from "react";
import type { BoxCallState } from "../../endurance/collaboration/types";
import {
  RADIO_HOTKEY_OPTIONS,
  formatKeyCode,
  type OverlayPanelPrefs,
} from "../../types/overlayPrefs";

interface Props {
  boxCall: BoxCallState;
  onToggle: () => void;
  onSendReply?: (message: string) => void;
  /** Aperçu démo : affiche le panneau même si l'appel n'est pas actif. */
  forceVisible?: boolean;
  /** Désactive clics / réponses (aperçu layout). */
  interactive?: boolean;
  driverName?: string;
  carColor?: string;
  prefs?: OverlayPanelPrefs | null;
}

function formatDriverName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "PILOTE";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? trimmed;
  return last.replace(/\./g, "").toUpperCase();
}

/** Panneau team radio, couleur voiture + réponses raccourcis. */
export function BoxCallOverlayPanel({
  boxCall,
  onToggle,
  onSendReply,
  forceVisible = false,
  interactive = true,
  driverName = "Pilote",
  carColor = "#00d2be",
  prefs = null,
}: Props) {
  const active = boxCall.active;
  const visible = active || forceVisible;

  if (!visible) return null;

  const accent = carColor || "#00d2be";
  const displayName = formatDriverName(driverName);
  const fromDriver =
    (boxCall.byName ?? "").trim().toLowerCase() === "pilote";
  const canClick = interactive;

  const mainContent = (
    <>
      <span className="team-radio__top-bar" aria-hidden />
      <span className="team-radio__header">TEAM RADIO</span>
      <span className="team-radio__wave" aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className="team-radio__bar"
            style={{
              animationDelay: `${(i % 7) * 0.08}s`,
              height: `${28 + ((i * 17) % 48)}%`,
            }}
          />
        ))}
      </span>
      <span className="team-radio__driver">
        <span className="team-radio__driver-stripe" aria-hidden />
        <span className="team-radio__driver-name">{displayName}</span>
      </span>
      <span className="team-radio__message">
        <span className="team-radio__headset" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 3a7 7 0 0 0-7 7v2H4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v-9a5 5 0 0 1 10 0v9h2a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2h-1v-2a7 7 0 0 0-7-7Zm-3 11v3h2v-5H7v2h2Zm8-2h-2v5h2v-3h2v-2h-2Z" />
          </svg>
        </span>
        <span
          className={[
            "team-radio__quote",
            fromDriver ? "team-radio__quote--driver" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {boxCall.message?.trim() || "Box in this lap"}
        </span>
      </span>
    </>
  );

  return (
    <div
      className={[
        "team-radio",
        active ? "team-radio--live" : "team-radio--preview",
        fromDriver ? "team-radio--driver-reply" : null,
        !canClick ? "team-radio--layout-only" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ "--radio-accent": accent } as CSSProperties}
      data-ath-interactive={canClick ? true : undefined}
    >
      {canClick ? (
        <button
          type="button"
          className="team-radio__main"
          onClick={onToggle}
          title={
            active
              ? `Radio — ${boxCall.byName ?? "équipe"} (cliquer pour annuler)`
              : "Aperçu team radio"
          }
          aria-label={active ? "Annuler la radio" : "Activer la radio"}
        >
          {mainContent}
        </button>
      ) : (
        <div className="team-radio__main" aria-hidden>
          {mainContent}
        </div>
      )}

      {canClick && active && onSendReply ? (
        <div className="team-radio__replies">
          {RADIO_HOTKEY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="team-radio__reply"
              onClick={() => onSendReply(opt.message)}
              title={
                prefs
                  ? `Raccourci : ${formatKeyCode(prefs[opt.id])}`
                  : opt.message
              }
            >
              <span>{opt.label}</span>
              {prefs?.[opt.id] ? (
                <kbd>{formatKeyCode(prefs[opt.id])}</kbd>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
