import type { EndurancePlan } from "../models";

/** Droits d'un participant à la session collaborative. */
export type CollaborationRole = "host" | "editor" | "viewer";

/** Presets radio équipe (live endurance). */
export type RadioPresetId = "box" | "push" | "safe" | "custom";

export const RADIO_PRESETS: Record<
  Exclude<RadioPresetId, "custom">,
  { label: string; message: string }
> = {
  box: { label: "BOX", message: "Box in this lap" },
  push: {
    label: "Keep Pushing",
    message: "Keep Pushing, don't make a bloom bloom",
  },
  safe: {
    label: "Safe",
    message: "No Risk, just bring this home",
  },
};

/** Message radio partagé (hôte + coéquipiers + overlay). */
export interface BoxCallState {
  active: boolean;
  byUserId: string | null;
  byName: string | null;
  at: string | null;
  message: string | null;
  preset: RadioPresetId | null;
}

export const DEFAULT_BOX_CALL: BoxCallState = {
  active: false,
  byUserId: null,
  byName: null,
  at: null,
  message: null,
  preset: null,
};

export interface CollaborationUser {
  id: string;
  name: string;
  role: CollaborationRole;
  connectedAt: string;
}

export interface CollaborationHostInfo {
  port: number;
  roomCode: string;
  addresses: string[];
  /** Session via relais Internet (pas de LAN). */
  viaRelay?: boolean;
  relayUrl?: string;
}

export interface CollaborationSession {
  active: boolean;
  mode: "off" | "host" | "guest";
  role: CollaborationRole | null;
  roomCode: string | null;
  hostAddress: string | null;
  users: CollaborationUser[];
  revision: number;
  error: string | null;
  /** Connexion via relais cloud (hôte ou invité). */
  viaRelay?: boolean;
}

export const DEFAULT_COLLABORATION_SESSION: CollaborationSession = {
  active: false,
  mode: "off",
  role: null,
  roomCode: null,
  hostAddress: null,
  users: [],
  revision: 0,
  error: null,
};

/** Messages WebSocket (invité ↔ serveur local de l'hôte). */
export type CollaborationClientMessage =
  | {
      type: "room:create";
      plan: EndurancePlan;
      hostName?: string;
    }
  | {
      type: "join";
      name: string;
      role: "editor" | "viewer";
      roomCode: string;
    }
  | {
      type: "plan:update";
      plan: EndurancePlan;
      revision: number;
    }
  | {
      type: "box_call";
      active: boolean;
      message?: string | null;
      preset?: RadioPresetId | null;
    }
  | { type: "ping" };

export type CollaborationServerMessage =
  | {
      type: "welcome";
      plan: EndurancePlan;
      revision: number;
      users: CollaborationUser[];
      yourId: string;
      yourRole: CollaborationRole;
      roomCode: string;
      boxCall: BoxCallState;
    }
  | {
      type: "plan";
      plan: EndurancePlan;
      revision: number;
      fromUserId: string;
      fromName: string;
    }
  | {
      type: "box_call";
      active: boolean;
      byUserId: string;
      byName: string;
      at: string;
      message: string | null;
      preset: RadioPresetId | null;
    }
  | { type: "users"; users: CollaborationUser[] }
  | { type: "error"; message: string }
  | { type: "pong" };

export function canEditStrategy(role: CollaborationRole | null): boolean {
  return role === "host" || role === "editor";
}

export function canEditSetup(role: CollaborationRole | null): boolean {
  return role === "host";
}

export const DEFAULT_COLLAB_PORT = 4177;

/** Relais cloud par défaut (modifiable dans l’UI, mémorisé). */
export const DEFAULT_COLLAB_RELAY_URL = "ws://127.0.0.1:4177";

const RELAY_STORAGE_KEY = "racewolf-collab-relay-url";

export function loadCollabRelayUrl(): string {
  try {
    const saved = localStorage.getItem(RELAY_STORAGE_KEY)?.trim();
    if (saved) {
      const cleaned = saved.replace(/\/$/, "");
      // Ancienne URL cloud inexistante → relais local.
      if (cleaned.includes("racewolf-collab-relay.onrender.com")) {
        return DEFAULT_COLLAB_RELAY_URL;
      }
      return cleaned;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_COLLAB_RELAY_URL.replace(/\/$/, "");
}

export function saveCollabRelayUrl(url: string): void {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed) return;
  try {
    localStorage.setItem(RELAY_STORAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
}

export function normalizeRelayUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed) return DEFAULT_COLLAB_RELAY_URL;
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed;
  }
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}`;
  }
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}`;
  }
  return `wss://${trimmed}`;
}

export function buildCollabUrl(host: string, port = DEFAULT_COLLAB_PORT): string {
  const trimmed = host.trim();
  if (trimmed.startsWith("ws://") || trimmed.startsWith("wss://")) {
    return trimmed.replace(/\/$/, "");
  }
  return `ws://${trimmed}:${port}`;
}
