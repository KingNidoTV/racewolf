/**
 * Serveur relais WebSocket RaceWolf — sessions collaboratives sur Internet.
 *
 * Variables d'environnement :
 *   PORT — port d'écoute (défaut 4177)
 *   HOST — interface (défaut 0.0.0.0)
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import {
  listBetaUsers,
  parseBetaPayload,
  toCsv,
  upsertBetaUser,
} from "./betaRoster.mjs";
import { renderBetaAdminHtml, renderBetaLoginHtml } from "./betaAdminPage.mjs";

const PORT = Number(process.env.PORT) || 4177;
const HOST = process.env.HOST || "0.0.0.0";
const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const BETA_ADMIN_TOKEN = process.env.BETA_ADMIN_TOKEN || "racewolf";

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * @typedef {Object} ClientState
 * @property {string} id
 * @property {string} name
 * @property {"host"|"editor"|"viewer"} role
 * @property {WebSocket} ws
 */

/**
 * @typedef {Object} BoxCallState
 * @property {boolean} active
 * @property {string|null} byUserId
 * @property {string|null} byName
 * @property {string|null} at
 * @property {string|null} message
 * @property {string|null} preset
 */

/**
 * @typedef {Object} Room
 * @property {string} code
 * @property {object} plan
 * @property {number} revision
 * @property {ClientState} host
 * @property {Map<WebSocket, ClientState>} guests
 * @property {BoxCallState} boxCall
 * @property {number} createdAt
 */

const DEFAULT_BOX_CALL = {
  active: false,
  byUserId: null,
  byName: null,
  at: null,
  message: null,
  preset: null,
};

function generateRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function listUsers(room) {
  const users = [
    {
      id: room.host.id,
      name: room.host.name,
      role: room.host.role,
      connectedAt: "",
    },
  ];
  for (const guest of room.guests.values()) {
    users.push({
      id: guest.id,
      name: guest.name,
      role: guest.role,
      connectedAt: "",
    });
  }
  return users;
}

function broadcastUsers(room) {
  const users = listUsers(room);
  const msg = { type: "users", users };
  send(room.host.ws, msg);
  for (const ws of room.guests.keys()) {
    send(ws, msg);
  }
}

function broadcastExcept(room, msg, exceptWs = null) {
  if (room.host.ws !== exceptWs) send(room.host.ws, msg);
  for (const [guestWs] of room.guests) {
    if (guestWs !== exceptWs) send(guestWs, msg);
  }
}

function destroyRoom(code, reason) {
  const room = rooms.get(code);
  if (!room) return;
  const err = { type: "error", message: reason };
  for (const ws of room.guests.keys()) {
    send(ws, err);
    ws.close();
  }
  send(room.host.ws, err);
  rooms.delete(code);
}

function handleRoomCreate(ws, msg) {
  if (!msg.plan) {
    send(ws, { type: "error", message: "Plan manquant" });
    ws.close();
    return;
  }

  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const hostName = (msg.hostName || "Hôte").trim().slice(0, 32) || "Hôte";
  const host = {
    id: randomUUID(),
    name: hostName,
    role: "host",
    ws,
  };

  const room = {
    code,
    plan: msg.plan,
    revision: 1,
    host,
    guests: new Map(),
    boxCall: { ...DEFAULT_BOX_CALL },
    createdAt: Date.now(),
  };
  rooms.set(code, room);

  send(ws, {
    type: "welcome",
    plan: room.plan,
    revision: room.revision,
    users: listUsers(room),
    yourId: host.id,
    yourRole: "host",
    roomCode: code,
    boxCall: room.boxCall,
  });

  console.log(`[relay] room ${code} created by ${hostName}`);
}

function handleJoin(ws, msg) {
  const code = String(msg.roomCode || "").trim();
  const room = rooms.get(code);
  if (!room) {
    send(ws, {
      type: "error",
      message: "Session introuvable — vérifiez le code",
    });
    ws.close();
    return;
  }

  const name = (msg.name || "Invité").trim().slice(0, 32) || "Invité";
  const role = msg.role === "editor" ? "editor" : "viewer";
  const guest = {
    id: randomUUID(),
    name,
    role,
    ws,
  };
  room.guests.set(ws, guest);

  send(ws, {
    type: "welcome",
    plan: room.plan,
    revision: room.revision,
    users: listUsers(room),
    yourId: guest.id,
    yourRole: role,
    roomCode: code,
    boxCall: room.boxCall,
  });
  broadcastUsers(room);

  console.log(`[relay] ${name} (${role}) joined room ${code}`);
}

function handlePlanUpdate(ws, msg) {
  const room = findRoomByWs(ws);
  if (!room) {
    send(ws, { type: "error", message: "Non connecté à une session" });
    return;
  }

  const participant = getParticipant(room, ws);
  if (!participant) return;

  if (participant.role !== "host" && participant.role !== "editor") {
    send(ws, {
      type: "error",
      message: "Vous n'avez pas les droits de modification",
    });
    return;
  }

  if (!msg.plan || msg.revision <= room.revision) return;

  room.plan = msg.plan;
  room.revision = msg.revision;

  broadcastExcept(
    room,
    {
      type: "plan",
      plan: msg.plan,
      revision: msg.revision,
      fromUserId: participant.id,
      fromName: participant.name,
    },
    ws,
  );
}

function handleBoxCall(ws, msg) {
  const room = findRoomByWs(ws);
  if (!room) {
    send(ws, { type: "error", message: "Non connecté à une session" });
    return;
  }

  const participant = getParticipant(room, ws);
  if (!participant) return;

  const at = new Date().toISOString();
  const active = Boolean(msg.active);
  room.boxCall = active
    ? {
        active: true,
        byUserId: participant.id,
        byName: participant.name,
        at,
        message: msg.message?.trim?.() || msg.message || null,
        preset: msg.preset ?? null,
      }
    : { ...DEFAULT_BOX_CALL, at };

  broadcastExcept(
    room,
    {
      type: "box_call",
      active: room.boxCall.active,
      byUserId: room.boxCall.byUserId ?? participant.id,
      byName: room.boxCall.byName ?? participant.name,
      at: room.boxCall.at ?? at,
      message: room.boxCall.message,
      preset: room.boxCall.preset,
    },
    null,
  );
}

function findRoomByWs(ws) {
  for (const room of rooms.values()) {
    if (room.host.ws === ws || room.guests.has(ws)) {
      return room;
    }
  }
  return null;
}

function getParticipant(room, ws) {
  if (room.host.ws === ws) return room.host;
  return room.guests.get(ws) ?? null;
}

function handleDisconnect(ws) {
  for (const [code, room] of rooms) {
    if (room.host.ws === ws) {
      console.log(`[relay] host left room ${code}`);
      destroyRoom(code, "L'hôte a quitté la session");
      return;
    }
    if (room.guests.has(ws)) {
      room.guests.delete(ws);
      broadcastUsers(room);
      return;
    }
  }
}

function handleMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(String(raw));
  } catch {
    send(ws, { type: "error", message: "Message invalide" });
    return;
  }

  switch (msg.type) {
    case "room:create":
      handleRoomCreate(ws, msg);
      break;
    case "join":
      handleJoin(ws, msg);
      break;
    case "plan:update":
      handlePlanUpdate(ws, msg);
      break;
    case "box_call":
      handleBoxCall(ws, msg);
      break;
    case "ping":
      send(ws, { type: "pong" });
      break;
    default:
      send(ws, { type: "error", message: "Type de message inconnu" });
  }
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isAdmin(url) {
  return url.searchParams.get("token") === BETA_ADMIN_TOKEN;
}

const httpServer = createServer((req, res) => {
  void handleHttp(req, res);
});

async function handleHttp(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  cors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (url.pathname === "/beta-register" && req.method === "POST") {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "JSON invalide" }));
        return;
      }
      const entry = parseBetaPayload(payload);
      if (!entry) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            ok: false,
            error: "Nom + e-mail requis (inscription Beta).",
          }),
        );
        return;
      }
      const result = await upsertBetaUser(entry);
      console.log(
        `[beta] ${result.created ? "new" : "update"} ${entry.email} (${entry.displayName})`,
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, total: result.total }));
      return;
    }

    if (url.pathname === "/beta" && req.method === "GET") {
      if (!isAdmin(url)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderBetaLoginHtml());
        return;
      }
      const users = await listBetaUsers();
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderBetaAdminHtml(users, BETA_ADMIN_TOKEN));
      return;
    }

    if (url.pathname === "/beta.csv" && req.method === "GET") {
      if (!isAdmin(url)) {
        res.writeHead(401, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Jeton admin invalide.");
        return;
      }
      const users = await listBetaUsers();
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=racewolf-beta.csv",
      });
      res.end(toCsv(users));
      return;
    }

    const users = await listBetaUsers();
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(
      `RaceWolf collaboration relay — ${rooms.size} session(s), ${users.length} inscrit(s) Beta\nOuvrir /beta pour la liste.\n`,
    );
  } catch (err) {
    console.error("[relay] http", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Erreur serveur" }));
  }
}

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws) => {
  ws.on("message", (raw) => handleMessage(ws, raw));
  ws.on("close", () => handleDisconnect(ws));
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      console.log(`[relay] room ${code} expired`);
      destroyRoom(code, "Session expirée");
    }
  }
}, 60_000);

httpServer.listen(PORT, HOST, () => {
  console.log(`[relay] listening on ${HOST}:${PORT}`);
});
