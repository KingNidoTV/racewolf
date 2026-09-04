import { randomUUID } from "crypto";
import { createServer, type Server } from "http";
import { networkInterfaces } from "os";
import { WebSocket, WebSocketServer } from "ws";
import type { EndurancePlan } from "../../src/endurance/models";
import type {
  BoxCallState,
  CollaborationClientMessage,
  CollaborationRole,
  CollaborationServerMessage,
  CollaborationUser,
  RadioPresetId,
} from "../../src/endurance/collaboration/types";
import { DEFAULT_BOX_CALL } from "../../src/endurance/collaboration/types";

const DEFAULT_PORT = 4177;

interface ClientState {
  id: string;
  name: string;
  role: CollaborationRole;
}

export interface CollaborationHostInfo {
  port: number;
  roomCode: string;
  addresses: string[];
}

export type CollaborationPlanListener = (
  plan: EndurancePlan,
  revision: number,
  from: CollaborationUser,
) => void;

export type CollaborationUsersListener = (users: CollaborationUser[]) => void;

export type CollaborationBoxCallListener = (state: BoxCallState) => void;

function getLanAddresses(): string[] {
  const addresses: string[] = [];
  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === "IPv4" && !addr.internal) {
        addresses.push(addr.address);
      }
    }
  }
  return addresses.length > 0 ? addresses : ["127.0.0.1"];
}

function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export class CollaborationServer {
  private httpServer: Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientState>();
  private plan: EndurancePlan | null = null;
  private revision = 0;
  private roomCode = "";
  private port = DEFAULT_PORT;
  private boxCall: BoxCallState = { ...DEFAULT_BOX_CALL };
  private onPlanFromGuest: CollaborationPlanListener | null = null;
  private onUsersChange: CollaborationUsersListener | null = null;
  private onBoxCallChange: CollaborationBoxCallListener | null = null;

  isRunning(): boolean {
    return this.httpServer !== null;
  }

  getUsers(): CollaborationUser[] {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
      role: client.role,
      connectedAt: "",
    }));
  }

  start(
    plan: EndurancePlan,
    onPlanFromGuest?: CollaborationPlanListener,
    onUsersChange?: CollaborationUsersListener,
    onBoxCallChange?: CollaborationBoxCallListener,
  ): CollaborationHostInfo {
    this.stop();
    this.plan = plan;
    this.revision = 1;
    this.roomCode = generateRoomCode();
    this.boxCall = { ...DEFAULT_BOX_CALL };
    this.onPlanFromGuest = onPlanFromGuest ?? null;
    this.onUsersChange = onUsersChange ?? null;
    this.onBoxCallChange = onBoxCallChange ?? null;

    const httpServer = createServer((_req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("RaceWolf — session collaborative\n");
    });
    this.httpServer = httpServer;

    const wss = new WebSocketServer({ server: httpServer });
    this.wss = wss;

    wss.on("connection", (ws) => {
      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(String(raw)) as CollaborationClientMessage;
          this.handleClientMessage(ws, msg);
        } catch {
          this.send(ws, { type: "error", message: "Message invalide" });
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        this.broadcastUsers();
      });
    });

    httpServer.listen(this.port, "0.0.0.0");

    return {
      port: this.port,
      roomCode: this.roomCode,
      addresses: getLanAddresses(),
    };
  }

  pushPlan(plan: EndurancePlan, revision: number): void {
    if (!this.isRunning() || !this.plan) return;
    if (revision <= this.revision) return;
    this.plan = plan;
    this.revision = revision;
    this.broadcast({
      type: "plan",
      plan,
      revision,
      fromUserId: "host",
      fromName: "Hôte",
    });
  }

  /** Appel radio depuis l'UI hôte (IPC). */
  pushBoxCall(
    active: boolean,
    message: string | null = null,
    preset: RadioPresetId | null = null,
  ): BoxCallState {
    return this.applyBoxCall(active, "host", "Hôte", message, preset);
  }

  stop(): void {
    for (const ws of this.clients.keys()) {
      ws.close();
    }
    this.clients.clear();
    this.wss?.close();
    this.wss = null;
    this.httpServer?.close();
    this.httpServer = null;
    this.plan = null;
    this.revision = 0;
    this.roomCode = "";
    this.boxCall = { ...DEFAULT_BOX_CALL };
    this.onPlanFromGuest = null;
    this.onUsersChange = null;
    this.onBoxCallChange = null;
  }

  private handleClientMessage(
    ws: WebSocket,
    msg: CollaborationClientMessage,
  ): void {
    switch (msg.type) {
      case "join":
        this.handleJoin(ws, msg);
        break;
      case "plan:update":
        this.handlePlanUpdate(ws, msg);
        break;
      case "box_call":
        this.handleBoxCall(ws, msg);
        break;
      case "ping":
        this.send(ws, { type: "pong" });
        break;
      default:
        break;
    }
  }

  private handleJoin(
    ws: WebSocket,
    msg: Extract<CollaborationClientMessage, { type: "join" }>,
  ): void {
    if (!this.plan || !this.roomCode) {
      this.send(ws, { type: "error", message: "Aucune session active" });
      ws.close();
      return;
    }
    if (msg.roomCode !== this.roomCode) {
      this.send(ws, { type: "error", message: "Code de session incorrect" });
      ws.close();
      return;
    }

    const name = msg.name.trim().slice(0, 32) || "Invité";
    const role: CollaborationRole =
      msg.role === "editor" ? "editor" : "viewer";
    const id = randomUUID();

    this.clients.set(ws, { id, name, role });

    this.send(ws, {
      type: "welcome",
      plan: this.plan,
      revision: this.revision,
      users: this.listUsers(),
      yourId: id,
      yourRole: role,
      roomCode: this.roomCode,
      boxCall: this.boxCall,
    });
    this.broadcastUsers();
  }

  private handlePlanUpdate(
    ws: WebSocket,
    msg: Extract<CollaborationClientMessage, { type: "plan:update" }>,
  ): void {
    const client = this.clients.get(ws);
    if (!client) {
      this.send(ws, { type: "error", message: "Non connecté" });
      return;
    }
    if (client.role !== "editor") {
      this.send(ws, {
        type: "error",
        message: "Vous n'avez pas les droits de modification",
      });
      return;
    }
    if (msg.revision <= this.revision) return;

    this.plan = msg.plan;
    this.revision = msg.revision;

    const fromUser: CollaborationUser = {
      id: client.id,
      name: client.name,
      role: client.role,
      connectedAt: "",
    };

    this.broadcast({
      type: "plan",
      plan: msg.plan,
      revision: msg.revision,
      fromUserId: client.id,
      fromName: client.name,
    });
    this.onPlanFromGuest?.(msg.plan, msg.revision, fromUser);
  }

  private handleBoxCall(
    ws: WebSocket,
    msg: Extract<CollaborationClientMessage, { type: "box_call" }>,
  ): void {
    const client = this.clients.get(ws);
    if (!client) {
      this.send(ws, { type: "error", message: "Non connecté" });
      return;
    }
    this.applyBoxCall(
      msg.active,
      client.id,
      client.name,
      msg.message ?? null,
      msg.preset ?? null,
    );
  }

  private applyBoxCall(
    active: boolean,
    byUserId: string,
    byName: string,
    message: string | null = null,
    preset: RadioPresetId | null = null,
  ): BoxCallState {
    const at = new Date().toISOString();
    this.boxCall = active
      ? {
          active: true,
          byUserId,
          byName,
          at,
          message: message?.trim() || null,
          preset,
        }
      : { ...DEFAULT_BOX_CALL, at };

    const payload: Extract<CollaborationServerMessage, { type: "box_call" }> = {
      type: "box_call",
      active: this.boxCall.active,
      byUserId: this.boxCall.byUserId ?? byUserId,
      byName: this.boxCall.byName ?? byName,
      at: this.boxCall.at ?? at,
      message: this.boxCall.message,
      preset: this.boxCall.preset,
    };

    this.broadcast(payload);
    this.onBoxCallChange?.(this.boxCall);
    return this.boxCall;
  }

  private listUsers(): CollaborationUser[] {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      name: client.name,
      role: client.role,
      connectedAt: "",
    }));
  }

  private broadcastUsers(): void {
    const users = this.listUsers();
    this.broadcast({ type: "users", users });
    this.onUsersChange?.(users);
  }

  private broadcast(msg: CollaborationServerMessage): void {
    for (const ws of this.clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        this.send(ws, msg);
      }
    }
  }

  private send(ws: WebSocket, msg: CollaborationServerMessage): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }
}
