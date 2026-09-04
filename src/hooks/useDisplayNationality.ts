import { useSyncExternalStore } from "react";
import { getPlayerNationalityOverride } from "../utils/nationality";

function subscribe(cb: () => void): () => void {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useDisplayNationality(
  nationality: string,
  isPlayer?: boolean,
): string {
  const override = useSyncExternalStore(
    subscribe,
    getPlayerNationalityOverride,
    () => "",
  );
  if (isPlayer && override) return override;
  return nationality;
}
