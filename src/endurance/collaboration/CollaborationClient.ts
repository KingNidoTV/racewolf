import type { EndurancePlan } from "../models";
import type {
  BoxCallState,
  CollaborationClientMessage,
  CollaborationRole,
  CollaborationServerMessage,
  CollaborationUser,
  RadioPresetId,
} from "./types";
import { DEFAULT_BOX_CALL } from "./types";

export interface CollaborationClientCallbacks {
  onWelcome: (payload: {
    plan: EndurancePlan;
    revision: number;
    users: CollaborationUser[];
    yourId: string;
    yourRole: CollaborationRole;
    roomCode: string;
    boxCall: BoxCallState;
  }) => void;
  onPlan: (payload: {
    plan: EndurancePlan;
    revision: number;
    fromUserId: string;
    fromName: string;
  }) => void;
  onBoxCall: (state: BoxCallState) => void;
  onUsers: (users: CollaborationUser[]) => void;
  onError: (message: string) => void;
  /** true si la session avait déjà reçu un welcome. */
  onDisconnect: (hadSession: boolean) => void;
}

export class CollaborationClient {
  private socket: WebSocket | null = null;
  private callbacks: CollaborationClientCallbacks | null = null;
  private intentionalClose = false;
  private generation = 0;
  private welcomed = false;
  private connectErrorSent = false;

  /** Hôte distant : crée une room sur le relais. */
  createRoom(
    url: string,
    plan: EndurancePlan,
    hostName: string,
    callbacks: CollaborationClientCallbacks,
  ): void {
    this.connect(url, callbacks, () => {
      this.send({
        type: "room:create",
        plan,
        hostName: hostName.trim() || "Hôte",
      });
    });
  }

  joinRoom(
    url: string,
    name: string,
    role: "editor" | "viewer",
    roomCode: string,
    callbacks: CollaborationClientCallbacks,
  ): void {
    this.connect(url, callbacks, () => {
      this.send({
        type: "join",
        name,
        role,
        roomCode: roomCode.trim(),
      });
    });
  }

  private connect(
    url: string,
    callbacks: CollaborationClientCallbacks,
    onOpen: () => void,
  ): void {
    this.disconnect();
    this.intentionalClose = false;
    this.welcomed = false;
    this.connectErrorSent = false;
    this.callbacks = callbacks;
    const generation = ++this.generation;

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      callbacks.onError("URL de connexion invalide");
      return;
    }
    this.socket = socket;

    socket.addEventListener("open", () => {
      if (this.generation !== generation || this.intentionalClose) return;
      onOpen();
    });

    socket.addEventListener("message", (event) => {
      if (this.generation !== generation) return;
      try {
        const msg = JSON.parse(String(event.data)) as CollaborationServerMessage;
        this.handleMessage(msg);
      } catch {
        callbacks.onError("Message serveur invalide");
      }
    });

    socket.addEventListener("close", () => {
      if (this.generation !== generation) return;
      if (this.socket === socket) this.socket = null;
      if (this.intentionalClose) return;

      const hadSession = this.welcomed;
      if (!hadSession && !this.connectErrorSent) {
        this.connectErrorSent = true;
        callbacks.onError(
          "Serveur relais inaccessible — vérifiez l’URL, ou lancez npm run collab:relay en local",
        );
      }
      callbacks.onDisconnect(hadSession);
    });

    socket.addEventListener("error", () => {
      if (this.generation !== generation || this.intentionalClose) return;
      if (this.connectErrorSent) return;
      this.connectErrorSent = true;
      callbacks.onError(
        "Serveur relais inaccessible — vérifiez l’URL, ou lancez npm run collab:relay en local",
      );
    });
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.generation += 1;
    const socket = this.socket;
    this.socket = null;
    this.callbacks = null;
    this.welcomed = false;
    if (socket) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  sendPlanUpdate(plan: EndurancePlan, revision: number): void {
    this.send({ type: "plan:update", plan, revision });
  }

  sendBoxCall(
    active: boolean,
    message: string | null = null,
    preset: RadioPresetId | null = null,
  ): void {
    this.send({ type: "box_call", active, message, preset });
  }

  private send(msg: CollaborationClientMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(msg));
  }

  private handleMessage(msg: CollaborationServerMessage): void {
    const cb = this.callbacks;
    if (!cb) return;

    switch (msg.type) {
      case "welcome":
        this.welcomed = true;
        cb.onWelcome({
          plan: msg.plan,
          revision: msg.revision,
          users: msg.users,
          yourId: msg.yourId,
          yourRole: msg.yourRole,
          roomCode: msg.roomCode,
          boxCall: msg.boxCall ?? { ...DEFAULT_BOX_CALL },
        });
        break;
      case "plan":
        cb.onPlan({
          plan: msg.plan,
          revision: msg.revision,
          fromUserId: msg.fromUserId,
          fromName: msg.fromName,
        });
        break;
      case "box_call":
        cb.onBoxCall({
          active: msg.active,
          byUserId: msg.byUserId,
          byName: msg.byName,
          at: msg.at,
          message: msg.message ?? null,
          preset: msg.preset ?? null,
        });
        break;
      case "users":
        cb.onUsers(msg.users);
        break;
      case "error":
        cb.onError(msg.message);
        break;
      default:
        break;
    }
  }
}
