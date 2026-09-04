import { app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import type { BetaUserProfile, BetaRegisterInput } from "../../src/types/betaUser";

function profilePath(): string {
  return path.join(app.getPath("userData"), "beta-user.json");
}

function normalizeDisplayName(value: string): string {
  return value.trim().slice(0, 64);
}

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("E-mail invalide.");
  }
  return email.slice(0, 120);
}

export async function loadBetaUser(): Promise<BetaUserProfile | null> {
  try {
    const raw = await fs.readFile(profilePath(), "utf8");
    const data = JSON.parse(raw) as BetaUserProfile;
    if (!data?.id || !data.displayName) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveBetaUser(
  input: BetaRegisterInput,
  appVersion: string,
): Promise<BetaUserProfile> {
  const displayName = normalizeDisplayName(input.displayName);
  if (!displayName) {
    throw new Error("Indiquez un nom pour continuer.");
  }

  const email =
    input.mode === "signup"
      ? normalizeEmail(input.email)
      : normalizeEmail(input.email ?? null);

  if (input.mode === "signup" && !email) {
    throw new Error("L’e-mail est requis pour s’inscrire à la Beta.");
  }

  const existing = await loadBetaUser();
  const profile: BetaUserProfile = {
    id: existing?.id ?? crypto.randomUUID(),
    displayName,
    email,
    mode: input.mode,
    registeredAt: existing?.registeredAt ?? new Date().toISOString(),
    appVersion,
  };

  await fs.writeFile(profilePath(), JSON.stringify(profile, null, 2), "utf8");
  return profile;
}
