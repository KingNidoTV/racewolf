import { useState } from "react";
import type { BetaRegisterResult, BetaUserProfile } from "../types/betaUser";

interface Props {
  onComplete: (result: BetaRegisterResult) => void;
  register: (
    input: import("../types/betaUser").BetaRegisterInput,
  ) => Promise<BetaRegisterResult>;
  /** Profil déjà identifié : inscription Beta plus tard. */
  existingProfile?: BetaUserProfile | null;
  onCancel?: () => void;
}

export function BetaOnboarding({
  onComplete,
  register,
  existingProfile = null,
  onCancel,
}: Props) {
  const laterSignup = Boolean(existingProfile?.displayName);
  const [displayName, setDisplayName] = useState(
    existingProfile?.displayName ?? "",
  );
  const [email, setEmail] = useState(existingProfile?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitSignup = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await register({
        displayName,
        email,
        mode: "signup",
      });
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  };

  const submitIdentify = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await register({
        displayName,
        email: email.trim() || null,
        mode: "identify",
      });
      onComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identification impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="launcher launcher--onboarding">
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
            {laterSignup
              ? "Inscription Beta — tarif fondateur"
              : "Bienvenue dans la phase de test"}
          </p>
        </div>
      </header>

      {laterSignup && onCancel ? (
        <button
          type="button"
          className="launcher-page__back"
          onClick={onCancel}
        >
          ← Retour au launcher
        </button>
      ) : null}

      <div className="launcher__beta-intro">
        <p>
          {laterSignup ? (
            <>
              Ajoutez votre e-mail pour rejoindre la liste Beta et bénéficier du
              <strong> tarif fondateur</strong> au lancement.
            </>
          ) : (
            <>
              RaceWolf est en <strong>Beta</strong> : toutes les fonctions sont
              gratuites pendant les tests. Inscrivez-vous avec votre e-mail pour le
              <strong> tarif fondateur</strong>, ou continuez avec un nom seulement
              — vous pourrez vous inscrire plus tard.
            </>
          )}
        </p>
      </div>

      <form
        className="launcher__beta-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submitSignup();
        }}
      >
        <label className="launcher__field">
          <span>Nom affiché</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ex. Alex Martin"
            maxLength={64}
            required
            autoComplete="nickname"
          />
        </label>

        <label className="launcher__field">
          <span>{laterSignup ? "E-mail" : "E-mail (inscription Beta)"}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pour le tarif fondateur"
            autoComplete="email"
            required={laterSignup}
          />
        </label>

        {error ? <p className="launcher__beta-error">{error}</p> : null}

        <button
          type="submit"
          className="launcher__btn launcher__btn--primary"
          disabled={busy || !displayName.trim() || !email.trim()}
        >
          S&apos;inscrire à la Beta
        </button>

        {laterSignup ? null : (
          <button
            type="button"
            className="launcher__btn launcher__btn--secondary"
            disabled={busy || !displayName.trim()}
            onClick={() => void submitIdentify()}
          >
            Continuer avec un nom seulement
          </button>
        )}

        <p className="launcher__hint">
          {laterSignup
            ? "Votre nom reste le même. L’e-mail sert à vous contacter et à réserver le tarif fondateur."
            : "Sans e-mail, vous êtes identifié localement. Vous pourrez vous inscrire à la Beta plus tard depuis le launcher."}
        </p>
      </form>
    </div>
  );
}
