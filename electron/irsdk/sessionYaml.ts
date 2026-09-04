import type { IRacingSDK } from "irsdk-node";

/** YAML session brut (non parsé) depuis le module natif. */
export function readRawSessionYaml(sdk: IRacingSDK): string | undefined {
  const native = (sdk as unknown as { _sdk?: { getSessionData?: () => string } })
    ._sdk;
  const raw = native?.getSessionData?.();
  return typeof raw === "string" && raw.trim() ? raw : undefined;
}
