import { useEffect, useState } from "react";
import type { LauncherStatus } from "../types/ipc";
import {
  DEFAULT_OVERLAY_LAYOUT,
  DEFAULT_OVERLAY_PREFS,
  OVERLAY_PANEL_OPTIONS,
  RADIO_HOTKEY_OPTIONS,
  formatKeyCode,
  type OverlayPanelPrefs,
  type RadioHotkeyId,
} from "../types/overlayPrefs";
import { OverlayLayoutPreview } from "./OverlayLayoutPreview";

interface Props {
  status: LauncherStatus;
  busy: boolean;
  prefs: OverlayPanelPrefs;
  onBack: () => void;
  onStop: () => void;
  onPrefsChange: (patch: Partial<OverlayPanelPrefs>) => void;
  onResetPrefs: () => void;
}

function PrefNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="launcher-prefs__number">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function RadioKeyBind({
  label,
  message,
  code,
  listening,
  onListen,
  onClear,
}: {
  label: string;
  message: string;
  code: string;
  listening: boolean;
  onListen: () => void;
  onClear: () => void;
}) {
  return (
    <div className="launcher-prefs__bind">
      <div className="launcher-prefs__bind-text">
        <strong>{label}</strong>
        <small>« {message} »</small>
      </div>
      <div className="launcher-prefs__bind-actions">
        <button
          type="button"
          className={[
            "launcher__btn",
            "launcher__btn--ghost",
            "launcher__btn--sm",
            listening ? "launcher__btn--demo-active" : null,
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onListen}
        >
          {listening ? "Appuyez…" : formatKeyCode(code)}
        </button>
        <button
          type="button"
          className="launcher__btn launcher__btn--ghost launcher__btn--sm"
          onClick={onClear}
          title="Effacer le raccourci"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function PreviewPage({
  status,
  busy,
  prefs,
  onBack,
  onStop,
  onPrefsChange,
  onResetPrefs,
}: Props) {
  const [listeningId, setListeningId] = useState<RadioHotkeyId | null>(null);

  useEffect(() => {
    if (!listeningId) {
      void window.ath?.overlay?.cancelWheelInputListen?.();
      void window.ath?.overlay?.resumeRadioHotkeys?.();
      return;
    }

    let cancelled = false;
    void window.ath?.overlay?.suspendRadioHotkeys?.();

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === "Escape") {
        void window.ath?.overlay?.cancelWheelInputListen?.();
        setListeningId(null);
        return;
      }
      if (
        e.code === "ShiftLeft" ||
        e.code === "ShiftRight" ||
        e.code === "ControlLeft" ||
        e.code === "ControlRight" ||
        e.code === "AltLeft" ||
        e.code === "AltRight" ||
        e.code === "MetaLeft" ||
        e.code === "MetaRight"
      ) {
        return;
      }
      void window.ath?.overlay?.cancelWheelInputListen?.();
      onPrefsChange({ [listeningId]: e.code });
      setListeningId(null);
    };

    // DirectInput/SDL (MOZA, GSI…) — fiable hors API Gamepad Chromium.
    void window.ath?.overlay
      ?.listenWheelInput?.()
      .then((hit) => {
        if (cancelled || !hit) return;
        onPrefsChange({ [listeningId]: hit.code });
        setListeningId(null);
      })
      .catch(() => {
        /* annulé ou timeout */
      });

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKeyDown, true);
      void window.ath?.overlay?.cancelWheelInputListen?.();
      void window.ath?.overlay?.resumeRadioHotkeys?.();
    };
  }, [listeningId, onPrefsChange]);

  return (
    <div className="launcher-page">
      <header className="launcher-page__header">
        <button
          type="button"
          className="launcher-page__back"
          onClick={onBack}
        >
          ← Retour
        </button>
        <div>
          <h2>Aperçu overlay</h2>
          <p>
            Activez les panneaux, puis glissez-les dans l&apos;aperçu pour
            choisir leur place à l&apos;écran.
          </p>
        </div>
      </header>

      <div className="launcher-page__split launcher-page__split--preview-left">
        <OverlayLayoutPreview
          prefs={prefs}
          onLayoutChange={(layout) => onPrefsChange({ layout })}
          onResetLayout={() =>
            onPrefsChange({ layout: { ...DEFAULT_OVERLAY_LAYOUT } })
          }
        />

        <div className="launcher-page__controls">
          <section className="launcher-page__section">
            <h3>Panneaux actifs</h3>
            <p className="launcher-page__hint">
              Ces réglages s&apos;appliquent à l&apos;overlay pendant la
              course.
            </p>
            <div className="launcher-prefs">
              {OVERLAY_PANEL_OPTIONS.map((opt) => (
                <label key={opt.id} className="launcher-prefs__item">
                  <input
                    type="checkbox"
                    checked={prefs[opt.id]}
                    onChange={(e) =>
                      onPrefsChange({ [opt.id]: e.target.checked })
                    }
                  />
                  <span>
                    <strong>{opt.label}</strong>
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="launcher__btn launcher__btn--ghost launcher__btn--sm"
              onClick={onResetPrefs}
            >
              Réinitialiser
            </button>
          </section>

          {prefs.standings ? (
            <section className="launcher-page__section">
              <h3>Classement</h3>
              <div className="launcher-prefs__numbers">
                <PrefNumber
                  label="Top classement"
                  value={prefs.standingsTopN}
                  min={1}
                  max={20}
                  onChange={(standingsTopN) =>
                    onPrefsChange({ standingsTopN })
                  }
                />
                <PrefNumber
                  label="Pilotes devant"
                  value={prefs.standingsAhead}
                  min={0}
                  max={10}
                  onChange={(standingsAhead) =>
                    onPrefsChange({ standingsAhead })
                  }
                />
                <PrefNumber
                  label="Pilotes derrière"
                  value={prefs.standingsBehind}
                  min={0}
                  max={10}
                  onChange={(standingsBehind) =>
                    onPrefsChange({ standingsBehind })
                  }
                />
              </div>
              <label className="launcher-prefs__item">
                <input
                  type="checkbox"
                  checked={prefs.standingsShowOtherClasses}
                  onChange={(e) =>
                    onPrefsChange({
                      standingsShowOtherClasses: e.target.checked,
                    })
                  }
                />
                <span>
                  <strong>Autres catégories</strong>
                  <small>
                    Afficher le leader de chaque autre classe (ex. TCR, MX-5)
                  </small>
                </span>
              </label>
            </section>
          ) : null}

          {prefs.timing ? (
            <section className="launcher-page__section">
              <h3>Chronos</h3>
              <div className="launcher-prefs__numbers">
                <PrefNumber
                  label="Tours affichés"
                  value={prefs.timingRecentLaps}
                  min={1}
                  max={15}
                  onChange={(timingRecentLaps) =>
                    onPrefsChange({ timingRecentLaps })
                  }
                />
              </div>
            </section>
          ) : null}

          {prefs.relative ? (
            <section className="launcher-page__section">
              <h3>Relatif</h3>
              <div className="launcher-prefs__numbers">
                <PrefNumber
                  label="Pilotes devant"
                  value={prefs.relativeAhead}
                  min={0}
                  max={10}
                  onChange={(relativeAhead) =>
                    onPrefsChange({ relativeAhead })
                  }
                />
                <PrefNumber
                  label="Pilotes derrière"
                  value={prefs.relativeBehind}
                  min={0}
                  max={10}
                  onChange={(relativeBehind) =>
                    onPrefsChange({ relativeBehind })
                  }
                />
              </div>
            </section>
          ) : null}

          {prefs.boxCall ? (
            <section className="launcher-page__section">
              <h3>Radio — raccourcis</h3>
              <p className="launcher-page__hint">
                Cliquez puis appuyez sur une touche ou un bouton volant
                (MOZA / GSI…). Les touches ne sont plus bloquées : le chat
                iRacing reste utilisable. Échap pour annuler.
              </p>
              <div className="launcher-prefs__binds">
                {RADIO_HOTKEY_OPTIONS.map((opt) => (
                  <RadioKeyBind
                    key={opt.id}
                    label={opt.label}
                    message={opt.message}
                    code={prefs[opt.id]}
                    listening={listeningId === opt.id}
                    onListen={() =>
                      setListeningId((prev) =>
                        prev === opt.id ? null : opt.id,
                      )
                    }
                    onClear={() => onPrefsChange({ [opt.id]: "" })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <button
            type="button"
            className="launcher__btn launcher__btn--ghost"
            disabled={busy || !status.overlayActive}
            onClick={onStop}
          >
            Arrêter l&apos;overlay
          </button>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_OVERLAY_PREFS };
