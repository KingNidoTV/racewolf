import type { AthHud } from "../types/telemetry";
import { AthCircularHud } from "./AthCircularHud";

interface Props {
  ath: AthHud;
}

export function AthHudPanel({ ath }: Props) {
  return <AthCircularHud ath={ath} />;
}
