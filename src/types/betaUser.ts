export type BetaUserMode = "signup" | "identify";

export interface BetaUserProfile {
  id: string;
  displayName: string;
  email: string | null;
  mode: BetaUserMode;
  registeredAt: string;
  appVersion: string;
}

export interface BetaRegisterInput {
  displayName: string;
  email?: string | null;
  mode: BetaUserMode;
}

export interface BetaRegisterResult {
  profile: BetaUserProfile;
  remoteSynced: boolean;
  remoteError: string | null;
}
