import { useEffect, useState } from "react";
import type { EnduranceLiveSession } from "../models/LiveSession";
import { DEFAULT_LIVE_SESSION } from "../models/LiveSession";

export function useEnduranceLiveSession(): EnduranceLiveSession {
  const [live, setLive] = useState<EnduranceLiveSession>(DEFAULT_LIVE_SESSION);

  useEffect(() => {
    if (!window.ath?.endurance?.getLiveSession) return;

    void window.ath.endurance.getLiveSession().then((snapshot) => {
      if (snapshot) setLive(snapshot);
    });
    return window.ath.endurance.onLiveSession(setLive);
  }, []);

  return live;
}
