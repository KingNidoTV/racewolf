import { useCallback, useEffect, useRef, useState } from "react";
import {
  CollaborationClient,
  type CollaborationClientCallbacks,
} from "../collaboration/CollaborationClient";
import {
  buildCollabUrl,
  DEFAULT_BOX_CALL,
  DEFAULT_COLLABORATION_SESSION,
  loadCollabRelayUrl,
  normalizeRelayUrl,
  saveCollabRelayUrl,
  type BoxCallState,
  type CollaborationHostInfo,
  type CollaborationRole,
  type CollaborationSession,
  type RadioPresetId,
} from "../collaboration/types";
import type { EndurancePlan } from "../models";

interface Options {
  plan: EndurancePlan | null;
  onRemotePlan: (plan: EndurancePlan, revision: number) => void;
}

export function useCollaboration({ plan, onRemotePlan }: Options) {
  const [session, setSession] =
    useState<CollaborationSession>(DEFAULT_COLLABORATION_SESSION);
  const [hostInfo, setHostInfo] = useState<CollaborationHostInfo | null>(null);
  const [boxCall, setBoxCall] = useState<BoxCallState>(DEFAULT_BOX_CALL);
  const clientRef = useRef<CollaborationClient | null>(null);
  /** Hôte via relais = WebSocket client (pas le serveur Electron local). */
  const relayHostRef = useRef(false);
  const revisionRef = useRef(0);
  const onRemotePlanRef = useRef(onRemotePlan);
  onRemotePlanRef.current = onRemotePlan;

  const applyUsers = useCallback((users: CollaborationSession["users"]) => {
    setSession((prev) => ({ ...prev, users }));
  }, []);

  const applyBoxCall = useCallback((state: BoxCallState) => {
    setBoxCall(state);
  }, []);

  const disconnectGuest = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    relayHostRef.current = false;
  }, []);

  const leaveSession = useCallback(async () => {
    if (session.mode === "host" && !relayHostRef.current) {
      await window.ath?.endurance?.collabStopHost?.();
    } else {
      disconnectGuest();
    }
    revisionRef.current = 0;
    setHostInfo(null);
    setSession(DEFAULT_COLLABORATION_SESSION);
    const cleared = await window.ath?.boxCall?.apply?.(DEFAULT_BOX_CALL);
    setBoxCall(cleared ?? DEFAULT_BOX_CALL);
  }, [disconnectGuest, session.mode]);

  const connectCallbacks = useCallback(
    (asRelayHost: boolean): CollaborationClientCallbacks => ({
      onWelcome: (payload) => {
        revisionRef.current = payload.revision;
        if (!asRelayHost) {
          onRemotePlanRef.current(payload.plan, payload.revision);
        }
        setBoxCall(payload.boxCall);
        void window.ath?.boxCall?.apply?.(payload.boxCall);

        if (asRelayHost) {
          relayHostRef.current = true;
          setHostInfo({
            port: 0,
            roomCode: payload.roomCode,
            addresses: [],
            viaRelay: true,
            relayUrl: loadCollabRelayUrl(),
          });
          setSession({
            active: true,
            mode: "host",
            role: "host",
            roomCode: payload.roomCode,
            hostAddress: null,
            users: payload.users,
            revision: payload.revision,
            error: null,
            viaRelay: true,
          });
          return;
        }

        setSession({
          active: true,
          mode: "guest",
          role: payload.yourRole,
          roomCode: payload.roomCode,
          hostAddress: null,
          users: payload.users,
          revision: payload.revision,
          error: null,
          viaRelay: true,
        });
      },
      onPlan: (payload) => {
        if (payload.revision <= revisionRef.current) return;
        revisionRef.current = payload.revision;
        onRemotePlanRef.current(payload.plan, payload.revision);
        setSession((prev) => ({ ...prev, revision: payload.revision }));
      },
      onBoxCall: (state) => {
        setBoxCall(state);
        void window.ath?.boxCall?.apply?.(state);
      },
      onUsers: applyUsers,
      onError: (message) => {
        setSession((prev) => ({
          ...prev,
          active: false,
          mode: "off",
          error: message,
        }));
      },
      onDisconnect: (hadSession) => {
        relayHostRef.current = false;
        setHostInfo(null);
        clientRef.current = null;
        setSession((prev) => {
          // Garder l’erreur de connexion déjà affichée (relais down, etc.).
          if (!hadSession && prev.error) {
            return {
              ...DEFAULT_COLLABORATION_SESSION,
              error: prev.error,
            };
          }
          return {
            ...DEFAULT_COLLABORATION_SESSION,
            error: hadSession
              ? "Déconnecté de la session"
              : "Serveur relais inaccessible — vérifiez l’URL, ou lancez npm run collab:relay en local",
          };
        });
      },
    }),
    [applyUsers],
  );

  /** Héberger sur le même Wi‑Fi (serveur local Electron). */
  const startHostLan = useCallback(
    async (notice: string | null = null) => {
      if (!plan || !window.ath?.endurance?.collabStartHost) return;
      disconnectGuest();
      setSession((prev) => ({ ...prev, error: null }));
      setBoxCall(DEFAULT_BOX_CALL);
      void window.ath?.boxCall?.apply?.(DEFAULT_BOX_CALL);

      try {
        const info = await window.ath.endurance.collabStartHost(plan);
        revisionRef.current = 1;
        setHostInfo({ ...info, viaRelay: false });
        setSession({
          active: true,
          mode: "host",
          role: "host",
          roomCode: info.roomCode,
          hostAddress: info.addresses[0] ?? null,
          users: [],
          revision: 1,
          error: notice,
          viaRelay: false,
        });
      } catch {
        setSession((prev) => ({
          ...prev,
          error: "Impossible de démarrer la session locale",
        }));
      }
    },
    [disconnectGuest, plan],
  );

  /**
   * Tente une connexion relais sans polluer l’UI en cas d’échec
   * (utilisé pour enchaîner local → fallback Wi‑Fi).
   */
  const tryRelayHost = useCallback(
    (url: string, hostName: string) =>
      new Promise<boolean>((resolve) => {
        if (!plan) {
          resolve(false);
          return;
        }

        disconnectGuest();
        const client = new CollaborationClient();
        clientRef.current = client;
        let settled = false;
        const base = connectCallbacks(true);

        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (!ok) {
            client.disconnect();
            if (clientRef.current === client) clientRef.current = null;
            relayHostRef.current = false;
          }
          resolve(ok);
        };

        const timer = window.setTimeout(() => finish(false), 5000);

        client.createRoom(url, plan, hostName, {
          ...base,
          onWelcome: (payload) => {
            finish(true);
            base.onWelcome(payload);
          },
          onError: () => {
            /* tentatives silencieuses — message final ailleurs */
          },
          onDisconnect: (hadSession) => {
            if (!settled) {
              finish(false);
              return;
            }
            base.onDisconnect(hadSession);
          },
        });
      }),
    [connectCallbacks, disconnectGuest, plan],
  );

  /** Héberger à distance via relais — le coéquipier n’a besoin que du code. */
  const startHostRemote = useCallback(
    async (relayUrl?: string, hostName = "Hôte") => {
      if (!plan) return;
      setSession((prev) => ({ ...prev, error: null }));
      setBoxCall(DEFAULT_BOX_CALL);
      void window.ath?.boxCall?.apply?.(DEFAULT_BOX_CALL);

      const preferred = normalizeRelayUrl(relayUrl || loadCollabRelayUrl());
      saveCollabRelayUrl(preferred);
      const name = hostName.trim() || "Hôte";

      if (await tryRelayHost(preferred, name)) return;

      // Relais cloud down → démarrer un relais local embarqué.
      try {
        const local =
          await window.ath?.endurance?.collabEnsureLocalRelay?.();
        if (local?.url) {
          saveCollabRelayUrl(local.url);
          if (await tryRelayHost(local.url, name)) {
            setSession((prev) =>
              prev.active
                ? {
                    ...prev,
                    error:
                      "Relais local démarré. Coéquipier distant : même Wi‑Fi recommandé, ou URL publique du relais dans « Serveur relais ».",
                  }
                : prev,
            );
            return;
          }
        }
      } catch {
        /* ignore — fallback LAN */
      }

      await startHostLan(
        "Relais Internet indisponible — session ouverte en local (même Wi‑Fi).",
      );
    },
    [plan, startHostLan, tryRelayHost],
  );

  /** Rejoindre une session locale (IP + code). */
  const joinLan = useCallback(
    (
      hostIp: string,
      port: number,
      roomCode: string,
      name: string,
      role: "editor" | "viewer",
    ) => {
      disconnectGuest();
      setSession((prev) => ({ ...prev, error: null }));

      const url = buildCollabUrl(hostIp, port);
      const client = new CollaborationClient();
      clientRef.current = client;
      const callbacks = connectCallbacks(false);
      client.joinRoom(
        url,
        name.trim() || "Invité",
        role,
        roomCode.trim(),
        {
          ...callbacks,
          onWelcome: (payload) => {
            callbacks.onWelcome(payload);
            setSession((prev) => ({ ...prev, viaRelay: false }));
          },
        },
      );
    },
    [connectCallbacks, disconnectGuest],
  );

  /** Rejoindre à distance — code seul (+ nom / rôle). */
  const joinRemote = useCallback(
    async (
      roomCode: string,
      name: string,
      role: "editor" | "viewer",
      relayUrl?: string,
    ) => {
      disconnectGuest();
      setSession((prev) => ({ ...prev, error: null }));

      let url = normalizeRelayUrl(relayUrl || loadCollabRelayUrl());
      if (
        url.includes("127.0.0.1") ||
        url.includes("localhost")
      ) {
        try {
          const local =
            await window.ath?.endurance?.collabEnsureLocalRelay?.();
          if (local?.url) url = local.url;
        } catch {
          /* le join échouera avec un message clair */
        }
      }
      saveCollabRelayUrl(url);

      const client = new CollaborationClient();
      clientRef.current = client;
      client.joinRoom(
        url,
        name.trim() || "Invité",
        role,
        roomCode.trim(),
        connectCallbacks(false),
      );
    },
    [connectCallbacks, disconnectGuest],
  );

  /** @deprecated Compat — rejoint en LAN. */
  const joinSession = joinLan;
  /** @deprecated Compat — héberge en LAN. */
  const startHost = startHostLan;

  const pushPlan = useCallback(
    (nextPlan: EndurancePlan) => {
      if (!session.active) return;
      const nextRevision = revisionRef.current + 1;
      revisionRef.current = nextRevision;

      if (session.mode === "host" && !relayHostRef.current) {
        void window.ath?.endurance?.collabPushPlan?.(nextPlan, nextRevision);
      } else if (
        (session.mode === "guest" && session.role === "editor") ||
        (session.mode === "host" && relayHostRef.current)
      ) {
        clientRef.current?.sendPlanUpdate(nextPlan, nextRevision);
      }

      setSession((prev) => ({ ...prev, revision: nextRevision }));
    },
    [session.active, session.mode, session.role],
  );

  const toggleBoxCall = useCallback(() => {
    if (
      session.active &&
      (session.mode === "guest" || relayHostRef.current)
    ) {
      clientRef.current?.sendBoxCall(!boxCall.active);
      return;
    }

    if (window.ath?.boxCall?.toggle) {
      void window.ath.boxCall.toggle().then(setBoxCall);
      return;
    }

    setBoxCall(
      !boxCall.active
        ? {
            active: true,
            byUserId: "local",
            byName: "Équipe",
            at: new Date().toISOString(),
            message: "Box in this lap",
            preset: "box",
          }
        : DEFAULT_BOX_CALL,
    );
  }, [boxCall.active, session.active, session.mode]);

  const sendRadio = useCallback(
    (message: string, preset: RadioPresetId | null = "custom") => {
      const trimmed = message.trim();
      if (!trimmed) return;

      if (
        session.active &&
        (session.mode === "guest" || relayHostRef.current)
      ) {
        clientRef.current?.sendBoxCall(true, trimmed, preset);
        return;
      }

      if (window.ath?.boxCall?.set) {
        void window.ath.boxCall
          .set({ active: true, message: trimmed, preset })
          .then(setBoxCall);
        return;
      }

      if (session.active && session.mode === "host") {
        void window.ath?.endurance
          ?.collabPushBoxCall?.(true, trimmed, preset)
          .then((state) => {
            if (state) setBoxCall(state);
          });
        return;
      }

      setBoxCall({
        active: true,
        byUserId: "local",
        byName: "Équipe",
        at: new Date().toISOString(),
        message: trimmed,
        preset,
      });
    },
    [session.active, session.mode],
  );

  const clearRadio = useCallback(() => {
    if (
      session.active &&
      (session.mode === "guest" || relayHostRef.current)
    ) {
      clientRef.current?.sendBoxCall(false, null, null);
      return;
    }

    if (window.ath?.boxCall?.set) {
      void window.ath.boxCall
        .set({ active: false, message: null, preset: null })
        .then(setBoxCall);
      return;
    }

    if (session.active && session.mode === "host") {
      void window.ath?.endurance
        ?.collabPushBoxCall?.(false, null, null)
        .then((state) => {
          if (state) setBoxCall(state);
        });
      return;
    }

    setBoxCall(DEFAULT_BOX_CALL);
  }, [session.active, session.mode]);

  useEffect(() => {
    void window.ath?.boxCall?.get?.().then(setBoxCall);
    return window.ath?.boxCall?.onChange?.(setBoxCall);
  }, []);

  useEffect(() => {
    if (session.mode !== "host" || session.viaRelay) return;
    return window.ath?.endurance?.onCollabUsers?.(applyUsers);
  }, [applyUsers, session.mode, session.viaRelay]);

  useEffect(() => {
    if (session.mode !== "host" || session.viaRelay) return;
    return window.ath?.endurance?.onCollabPlan?.((remotePlan, revision) => {
      if (revision <= revisionRef.current) return;
      revisionRef.current = revision;
      onRemotePlanRef.current(remotePlan, revision);
      setSession((prev) => ({ ...prev, revision }));
    });
  }, [session.mode, session.viaRelay]);

  useEffect(() => {
    if (session.mode !== "host" || session.viaRelay) return;
    return window.ath?.endurance?.onCollabBoxCall?.(applyBoxCall);
  }, [applyBoxCall, session.mode, session.viaRelay]);

  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  const effectiveRole: CollaborationRole | null = session.active
    ? session.role
    : "host";

  return {
    session,
    hostInfo,
    boxCall,
    toggleBoxCall,
    sendRadio,
    clearRadio,
    effectiveRole,
    startHost,
    startHostLan,
    startHostRemote,
    joinSession,
    joinLan,
    joinRemote,
    leaveSession,
    pushPlan,
  };
}
