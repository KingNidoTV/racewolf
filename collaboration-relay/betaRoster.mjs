import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");
const dataFile = path.join(dataDir, "beta-users.json");

function normalizeEmail(value) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(0, 120);
}

/**
 * @param {unknown} payload
 * @returns {object | null}
 */
export function parseBetaPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const data = /** @type {Record<string, unknown>} */ (payload);
  const email = normalizeEmail(data.email);
  const displayName = String(data.displayName ?? data.name ?? "")
    .trim()
    .slice(0, 64);
  if (!email || !displayName) return null;
  if (data.mode && data.mode !== "signup") return null;

  return {
    id: String(data.id ?? email).slice(0, 80),
    displayName,
    email,
    mode: "signup",
    registeredAt: String(data.registeredAt ?? new Date().toISOString()),
    appVersion: String(data.appVersion ?? "").slice(0, 24),
    platform: String(data.platform ?? "").slice(0, 24),
    receivedAt: new Date().toISOString(),
  };
}

async function readAll() {
  try {
    const raw = await fs.readFile(dataFile, "utf8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeAll(list) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(list, null, 2), "utf8");
}

export async function upsertBetaUser(entry) {
  const list = await readAll();
  const index = list.findIndex(
    (row) => row.email === entry.email || row.id === entry.id,
  );
  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...entry,
      registeredAt: list[index].registeredAt || entry.registeredAt,
    };
  } else {
    list.push(entry);
  }
  await writeAll(list);
  return { total: list.length, created: index < 0 };
}

export async function listBetaUsers() {
  const list = await readAll();
  return list.sort((a, b) =>
    String(b.receivedAt).localeCompare(String(a.receivedAt)),
  );
}

export function toCsv(list) {
  const header = [
    "email",
    "displayName",
    "registeredAt",
    "appVersion",
    "platform",
    "id",
  ];
  const rows = list.map((row) =>
    header
      .map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
