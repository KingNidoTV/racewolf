import type { BetaUserProfile } from "../../src/types/betaUser";
import { BETA_NOTIFY_EMAIL, getBetaRegisterUrl } from "./betaRegisterConfig";

export async function submitBetaRegistration(
  profile: BetaUserProfile,
): Promise<{ ok: boolean; error: string | null }> {
  if (profile.mode !== "signup" || !profile.email) {
    return { ok: true, error: null };
  }

  const url = getBetaRegisterUrl();
  if (!url) return { ok: true, error: null };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        _subject: `RaceWolf Beta — ${profile.displayName}`,
        name: profile.displayName,
        email: profile.email,
        version: profile.appVersion,
        platform: process.platform,
        inscritLe: profile.registeredAt,
        id: profile.id,
      }),
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Envoi du recensement refusé (${res.status}). Profil local OK.`,
      };
    }
    return { ok: true, error: null };
  } catch {
    return {
      ok: false,
      error: `Mail non envoyé vers ${BETA_NOTIFY_EMAIL} — profil sauvé sur cet ordinateur.`,
    };
  }
}
