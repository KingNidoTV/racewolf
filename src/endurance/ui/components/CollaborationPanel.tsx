import { useState, useEffect } from "react";
import {
  loadCollabRelayUrl,
  type CollaborationHostInfo,
  type CollaborationSession,
} from "../../collaboration/types";
import { useBetaUser } from "../../../hooks/useBetaUser";
import { EnduranceMenuSelect } from "./EnduranceMenuSelect";

interface Props {
  session: CollaborationSession;
  hostInfo: CollaborationHostInfo | null;
  onStartHost: (relayUrl?: string, hostName?: string) => void;
  onJoin: (
    roomCode: string,
    name: string,
    role: "editor" | "viewer",
    relayUrl?: string,
  ) => void;
  onLeave: () => void;
}

function roleLabel(role: CollaborationSession["role"]): string {
  switch (role) {
    case "host":
      return "Hôte";
    case "editor":
      return "Éditeur";
    case "viewer":
      return "Lecture seule";
    default:
      return "";
  }
}

export function CollaborationPanel({
  session,
  hostInfo,
  onStartHost,
  onJoin,
  onLeave,
}: Props) {
  const { profile } = useBetaUser();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"host" | "join">("join");
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState("");
  const [joinRole, setJoinRole] = useState<"editor" | "viewer">("viewer");
  const [relayUrl, setRelayUrl] = useState(() => loadCollabRelayUrl());
  const [showRelay, setShowRelay] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profile?.displayName) return;
    setName((prev) => prev || profile.displayName);
    setHostName((prev) => prev || profile.displayName);
  }, [profile?.displayName]);

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    void onJoin(roomCode, name, joinRole, relayUrl);
    setOpen(false);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="endurance-collab">
      <button
        type="button"
        className={[
          "endurance-collab__toggle",
          session.active ? "endurance-collab__toggle--active" : null,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen((v) => !v)}
      >
        {session.active ? "Session active" : "Collaboration"}
      </button>

      {open ? (
        <div className="endurance-collab__panel">
          {session.active ? (
            <div className="endurance-collab__active">
              <p className="endurance-collab__role">
                {roleLabel(session.role)}
                {session.roomCode ? ` — code ${session.roomCode}` : ""}
              </p>

              {session.mode === "host" && hostInfo ? (
                <div className="endurance-collab__host-info">
                  <p>Donnez ce code à votre coéquipier :</p>
                  <p className="endurance-collab__code">{hostInfo.roomCode}</p>
                  <button
                    type="button"
                    className="endurance-btn endurance-btn--ghost endurance-btn--sm"
                    onClick={() => void copyCode(hostInfo.roomCode)}
                  >
                    {copied ? "Copié" : "Copier le code"}
                  </button>
                  <p className="endurance-collab__hint">
                    Le coéquipier saisit uniquement ce code pour rejoindre.
                  </p>
                  {!hostInfo.viaRelay && hostInfo.addresses.length > 0 ? (
                    <p className="endurance-collab__hint">
                      Session locale — adresses :{" "}
                      {hostInfo.addresses
                        .map((addr) => `${addr}:${hostInfo.port}`)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {session.users.length > 0 ? (
                <ul className="endurance-collab__users">
                  {session.users.map((user) => (
                    <li key={user.id}>
                      {user.name}{" "}
                      <span className="endurance-collab__user-role">
                        ({roleLabel(user.role)})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : session.mode === "host" ? (
                <p className="endurance-collab__hint">
                  En attente de participants…
                </p>
              ) : null}

              <button
                type="button"
                className="endurance-btn endurance-btn--ghost endurance-btn--sm"
                onClick={() => {
                  onLeave();
                  setOpen(false);
                }}
              >
                Quitter la session
              </button>
            </div>
          ) : (
            <>
              <div className="endurance-collab__tabs">
                <button
                  type="button"
                  className={
                    tab === "join" ? "endurance-collab__tab--active" : undefined
                  }
                  onClick={() => setTab("join")}
                >
                  Rejoindre
                </button>
                <button
                  type="button"
                  className={
                    tab === "host" ? "endurance-collab__tab--active" : undefined
                  }
                  onClick={() => setTab("host")}
                >
                  Héberger
                </button>
              </div>

              {tab === "host" ? (
                <div className="endurance-collab__form">
                  <p className="endurance-collab__hint">
                    Démarre une session et partage le code à 4 chiffres avec
                    votre coéquipier.
                  </p>
                  <label className="endurance-field">
                    <span>Votre nom (optionnel)</span>
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Hôte"
                      maxLength={32}
                    />
                  </label>
                  <button
                    type="button"
                    className="endurance-btn endurance-btn--primary endurance-btn--sm"
                    onClick={() =>
                      void onStartHost(relayUrl, hostName.trim() || "Hôte")
                    }
                  >
                    Démarrer la session
                  </button>
                </div>
              ) : (
                <div className="endurance-collab__form">
                  <p className="endurance-collab__hint">
                    Saisissez le code partagé par l&apos;hôte.
                  </p>
                  <label className="endurance-field">
                    <span>Code session</span>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value)}
                      placeholder="1234"
                      maxLength={4}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </label>
                  <label className="endurance-field">
                    <span>Votre nom</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Pilote 2"
                      maxLength={32}
                    />
                  </label>
                  <label className="endurance-field">
                    <span>Rôle</span>
                    <EnduranceMenuSelect
                      value={joinRole}
                      placeholder="Choisir un rôle…"
                      includeEmptyOption={false}
                      options={[
                        {
                          value: "viewer",
                          label: "Lecture seule — voir la stratégie",
                        },
                        {
                          value: "editor",
                          label: "Éditeur — modifier la stratégie",
                        },
                      ]}
                      onChange={(v) =>
                        setJoinRole(v === "editor" ? "editor" : "viewer")
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="endurance-btn endurance-btn--primary endurance-btn--sm"
                    onClick={handleJoin}
                  >
                    Rejoindre
                  </button>
                </div>
              )}

              <div className="endurance-collab__relay">
                <button
                  type="button"
                  className="endurance-collab__relay-toggle"
                  onClick={() => setShowRelay((v) => !v)}
                >
                  {showRelay
                    ? "Masquer le serveur relais"
                    : "Serveur relais (avancé)"}
                </button>
                {showRelay ? (
                  <label className="endurance-field">
                    <span>URL WebSocket</span>
                    <input
                      type="text"
                      value={relayUrl}
                      onChange={(e) => setRelayUrl(e.target.value)}
                      placeholder="wss://… ou ws://127.0.0.1:4177"
                    />
                  </label>
                ) : null}
              </div>
            </>
          )}

          {session.error ? (
            <p className="endurance-collab__error">{session.error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
