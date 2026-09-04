import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import type {
  LauncherStatus,
  LauncherWindowMode,
} from "../types/ipc";
import { DEFAULT_OVERLAY_PREFS } from "../types/overlayPrefs";
import { useOverlayPrefs } from "../hooks/useOverlayPrefs";
import { useBetaUser } from "../hooks/useBetaUser";
import { BetaOnboarding } from "./BetaOnboarding";

const PreviewPage = lazy(() =>
  import("./PreviewPage").then((m) => ({ default: m.PreviewPage })),
);
const EnduranceApp = lazy(() =>
  import("../endurance/ui/EnduranceApp").then((m) => ({ default: m.EnduranceApp })),
);

type LauncherView = "home" | "preview" | "endurance";

function LauncherLoading() {
  return (
    <div className="launcher launcher--loading">
      <p className="launcher__hint">Chargement…</p>
    </div>
  );
}

const defaultStatus: LauncherStatus = {
  overlayActive: false,
  iracingRunning: false,
  connected: false,
  source: null,
  viewMode: null,
  demoPreset: null,
  error: null,
};

export function Launcher() {
  const [view, setView] = useState<LauncherView>("home");
  const [status, setStatus] = useState<LauncherStatus>(defaultStatus);
  const [busy, setBusy] = useState(false);
  const [betaNotice, setBetaNotice] = useState<string | null>(null);
  const [showBetaSignup, setShowBetaSignup] = useState(false);
  const [bridgeOk, setBridgeOk] = useState(
    () => typeof window !== "undefined" && Boolean(window.ath?.launcher),
  );
  const { prefs, updatePrefs, setAll } = useOverlayPrefs();
  const { profile, loading: betaLoading, register, isRegistered } = useBetaUser();

  const refresh = useCallback(async () => {
    if (!window.ath?.launcher) return;
    setStatus(await window.ath.launcher.getStatus());
  }, []);

  const setWindowMode = useCallback((mode: LauncherWindowMode) => {
    void window.ath?.launcher?.setWindowMode?.(mode);
  }, []);

  const goTo = useCallback(
    (next: LauncherView) => {
      setView(next);
      setWindowMode(next);
    },
    [setWindowMode],
  );

  useEffect(() => {
    if (window.ath?.launcher) {
      setBridgeOk(true);
      void refresh();
      return window.ath.launcher.onStatus(setStatus);
    }
    const t = window.setTimeout(() => setBridgeOk(false), 800);
    return () => window.clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    setWindowMode("home");
  }, [setWindowMode]);

  const startSdk = async () => {
    if (!window.ath?.launcher) return;
    setBusy(true);
    try {
      await window.ath.launcher.start("sdk");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!window.ath?.launcher) return;
    setBusy(true);
    try {
      await window.ath.launcher.stop();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  if (betaLoading) {
    return <LauncherLoading />;
  }

  const canUpgradeToBeta =
    Boolean(profile?.displayName) &&
    (profile?.mode !== "signup" || !profile.email);

  if (!isRegistered) {
    return (
      <BetaOnboarding
        register={register}
        onComplete={(result) => {
          if (result.remoteError) {
            setBetaNotice(result.remoteError);
          }
        }}
      />
    );
  }

  if (showBetaSignup && canUpgradeToBeta) {
    return (
      <BetaOnboarding
        existingProfile={profile}
        register={register}
        onCancel={() => setShowBetaSignup(false)}
        onComplete={(result) => {
          setShowBetaSignup(false);
          if (result.remoteError) {
            setBetaNotice(result.remoteError);
          } else {
            setBetaNotice(null);
          }
        }}
      />
    );
  }

  if (view === "endurance") {
    return (
      <Suspense fallback={<LauncherLoading />}>
        <EnduranceApp embedded onBack={() => goTo("home")} />
      </Suspense>
    );
  }

  if (view === "preview") {
    return (
      <div className="launcher launcher--page">
        <Suspense fallback={<LauncherLoading />}>
          <PreviewPage
            status={status}
            busy={busy}
            prefs={prefs}
            onBack={() => goTo("home")}
            onStop={() => void stop()}
            onPrefsChange={(patch) => void updatePrefs(patch)}
            onResetPrefs={() => void setAll(DEFAULT_OVERLAY_PREFS)}
          />
        </Suspense>
      </div>
    );
  }

  const iracingDot = status.iracingRunning
    ? "launcher__status-dot--ok"
    : "launcher__status-dot--off";
  const overlayDot = status.overlayActive
    ? "launcher__status-dot--ok"
    : "launcher__status-dot--off";

  const sourceLabel =
    status.source === "sdk"
      ? "iRacing SDK"
      : status.source === "mock"
        ? "Mock"
        : "—";

  return (
    <div className="launcher">
      <header className="launcher__header">
        <div className="launcher__logo-wrap">
          <img
            className="launcher__logo"
            src="./assets/racewolf-logo.png"
            alt=""
            width={56}
            height={56}
          />
        </div>
        <div className="launcher__titles">
          <h1 className="launcher__brand">
            <span className="launcher__brand-race">Race</span>
            <span className="launcher__brand-wolf">Wolf</span>
            <span className="launcher__beta-tag">Beta</span>
          </h1>
          <p className="launcher__subtitle">
            {profile?.displayName
              ? `Connecté · ${profile.displayName}`
              : "Overlay iRacing"}
          </p>
        </div>
      </header>

      {betaNotice ? (
        <p className="launcher__beta-notice">{betaNotice}</p>
      ) : null}

      <div className="launcher__status">
        <p>
          <span className={`launcher__status-dot ${iracingDot}`} />
          iRacing : {status.iracingRunning ? "détecté" : "non lancé"}
        </p>
        <p>
          <span className={`launcher__status-dot ${overlayDot}`} />
          Overlay :{" "}
          {status.overlayActive ? `actif — ${sourceLabel}` : "arrêté"}
        </p>
        {profile?.mode === "signup" && profile.email ? (
          <p className="launcher__beta-line">
            Beta fondateur · {profile.email}
          </p>
        ) : (
          <button
            type="button"
            className="launcher__beta-upgrade"
            onClick={() => setShowBetaSignup(true)}
          >
            S&apos;inscrire à la Beta plus tard — tarif fondateur
          </button>
        )}
        {status.error ? (
          <p style={{ color: "#ff8a8a", marginTop: "0.35rem" }}>{status.error}</p>
        ) : null}
      </div>

      {!bridgeOk ? (
        <p className="launcher__error">
          Connexion au launcher impossible. Relancez via{" "}
          <code>RaceWolf.lnk</code> ou <code>npm run dev</code>.
        </p>
      ) : null}

      <div className="launcher__actions">
        <button
          type="button"
          className="launcher__btn launcher__btn--secondary"
          disabled={busy}
          onClick={() => goTo("preview")}
        >
          Overlay
        </button>

        <button
          type="button"
          className="launcher__btn launcher__btn--secondary"
          disabled={busy}
          onClick={() => goTo("endurance")}
        >
          Pit Crew
        </button>

        <button
          type="button"
          className="launcher__btn launcher__btn--primary"
          disabled={busy || (status.overlayActive && status.source === "sdk")}
          onClick={() => void startSdk()}
        >
          Lancer l&apos;overlay
        </button>

        <button
          type="button"
          className="launcher__btn launcher__btn--ghost"
          disabled={busy || !status.overlayActive}
          onClick={() => void stop()}
        >
          Arrêter l&apos;overlay
        </button>
      </div>
    </div>
  );
}
