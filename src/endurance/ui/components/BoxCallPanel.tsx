import { useState } from "react";
import {
  RADIO_PRESETS,
  type BoxCallState,
  type RadioPresetId,
} from "../../collaboration/types";

interface Props {
  boxCall: BoxCallState;
  onSend: (message: string, preset: RadioPresetId) => void;
  onClear: () => void;
  /** Affiche l'alerte renforcée (fin de relais proche). */
  suggestPit?: boolean;
  toursRestants?: number | null;
}

export function BoxCallPanel({
  boxCall,
  onSend,
  onClear,
  suggestPit = false,
  toursRestants = null,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const active = boxCall.active;
  const highlight = active || suggestPit;

  const sendPreset = (preset: Exclude<RadioPresetId, "custom">) => {
    setEditing(false);
    onSend(RADIO_PRESETS[preset].message, preset);
  };

  const sendCustom = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed, "custom");
    setDraft("");
    setEditing(false);
  };

  return (
    <div
      className={[
        "endurance-box-call",
        "endurance-radio",
        highlight ? "endurance-box-call--alert" : null,
        active ? "endurance-box-call--active" : null,
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="endurance-box-call__text">
        <strong>Radio</strong>
        <span>
          {active
            ? `À l'antenne (${boxCall.byName ?? "équipe"}) — « ${boxCall.message ?? "…"} »`
            : suggestPit
              ? toursRestants != null && toursRestants >= 0
                ? `Fenêtre pits dans ~${toursRestants} tour${toursRestants === 1 ? "" : "s"}`
                : "Fenêtre pits approchante"
              : "Transmettez un message au pilote"}
        </span>
      </div>

      <div className="endurance-radio__actions">
        <button
          type="button"
          className={[
            "endurance-btn",
            active && boxCall.preset === "box"
              ? "endurance-btn--primary"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => sendPreset("box")}
        >
          BOX
        </button>
        <button
          type="button"
          className={[
            "endurance-btn",
            active && boxCall.preset === "push"
              ? "endurance-btn--primary"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => sendPreset("push")}
        >
          Keep Pushing
        </button>
        <button
          type="button"
          className={[
            "endurance-btn",
            active && boxCall.preset === "safe"
              ? "endurance-btn--primary"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => sendPreset("safe")}
        >
          Safe
        </button>
        <button
          type="button"
          className={[
            "endurance-btn",
            editing || (active && boxCall.preset === "custom")
              ? "endurance-btn--primary"
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => {
            setEditing((v) => !v);
            if (!editing && boxCall.preset === "custom" && boxCall.message) {
              setDraft(boxCall.message);
            }
          }}
        >
          Edit
        </button>
        {active ? (
          <button
            type="button"
            className="endurance-btn endurance-box-call__btn--clear"
            onClick={onClear}
          >
            Annuler
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="endurance-radio__edit">
          <input
            type="text"
            className="endurance-radio__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message radio…"
            maxLength={120}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendCustom();
            }}
          />
          <button
            type="button"
            className="endurance-btn endurance-btn--primary"
            onClick={sendCustom}
            disabled={!draft.trim()}
          >
            Envoyer
          </button>
        </div>
      ) : null}
    </div>
  );
}
