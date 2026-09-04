import { useCallback, useEffect, useState } from "react";
import type {
  BetaRegisterInput,
  BetaRegisterResult,
  BetaUserProfile,
} from "../types/betaUser";

const CACHE_KEY = "racewolf-beta-user";

function readCachedProfile(): BetaUserProfile | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as BetaUserProfile;
    return data?.displayName ? data : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: BetaUserProfile | null): void {
  if (typeof localStorage === "undefined") return;
  if (!profile) {
    localStorage.removeItem(CACHE_KEY);
    return;
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
}

export function useBetaUser() {
  const cached = readCachedProfile();
  const [profile, setProfile] = useState<BetaUserProfile | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const refresh = useCallback(async () => {
    if (!window.ath?.launcher?.getBetaUser) {
      setLoading(false);
      return;
    }
    try {
      const next = await window.ath.launcher.getBetaUser();
      setProfile(next);
      writeCachedProfile(next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const register = useCallback(
    async (input: BetaRegisterInput): Promise<BetaRegisterResult> => {
      if (!window.ath?.launcher?.registerBetaUser) {
        throw new Error("Inscription Beta indisponible.");
      }
      const result = await window.ath.launcher.registerBetaUser(input);
      setProfile(result.profile);
      writeCachedProfile(result.profile);
      return result;
    },
    [],
  );

  return {
    profile,
    loading,
    refresh,
    register,
    isRegistered: Boolean(profile?.displayName),
  };
}
