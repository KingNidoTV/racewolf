import { useCallback, useEffect, useRef, useState } from "react";
import {
  IRACING_CARS,
  IRACING_TRACKS,
  findCatalogEntryByLabel,
} from "../data/catalog";
import { generateStrategy, litresParTourDepuisLph, recalculerStrategie } from "../engine";
import { canValidateStrategyForLive } from "../engine";
import { buildStrategyPdfHtml } from "../live";
import type { Driver, EndurancePlan, RaceSettings, Stint, Strategy } from "../models";
import {
  canEditSetup,
  canEditStrategy,
} from "../collaboration/types";
import { createEnduranceStorage } from "../storage/enduranceStorage";
import { useCollaboration } from "./useCollaboration";
import { useEnduranceLiveSession } from "./useEnduranceLiveSession";

export type EndurancePageId = "setup" | "strategy" | "live";

const storage = createEnduranceStorage();

function mergeLiveIntoPlan(
  plan: EndurancePlan,
  live: ReturnType<typeof useEnduranceLiveSession>,
): { next: EndurancePlan; changed: boolean } {
  let raceSettings = plan.raceSettings;
  let drivers = plan.drivers;
  let changed = false;

  const applyRace = (patch: Partial<RaceSettings>) => {
    raceSettings = { ...raceSettings, ...patch };
    changed = true;
  };

  if (live.connected && live.isPractice && live.pitDurationSec > 0) {
    if (raceSettings.tempsPitEstime) {
      if (
        raceSettings.tempsPitMoyenSecondes !== live.pitDurationSec ||
        raceSettings.tempsPitEstime !== live.pitTimeEstimated
      ) {
        applyRace({
          tempsPitMoyenSecondes: live.pitDurationSec,
          tempsPitEstime: live.pitTimeEstimated,
        });
      }
    }
  }

  if (live.connected && live.isPractice) {
    if (live.capaciteReservoirLitres > 0) {
      const doitMettreAJour =
        raceSettings.capaciteReservoirEstimee ||
        raceSettings.capaciteReservoirLitres <= 0;
      if (
        doitMettreAJour &&
        (raceSettings.capaciteReservoirLitres !== live.capaciteReservoirLitres ||
          raceSettings.capaciteReservoirEstimee)
      ) {
        applyRace({
          capaciteReservoirLitres: live.capaciteReservoirLitres,
          capaciteReservoirEstimee: false,
        });
      }
    }

    if (live.consommationLitresParHeure > 0) {
      drivers = drivers.map((driver) => {
        if (!driver.consommationEstimee) return driver;
        const nextLpt = litresParTourDepuisLph(
          live.consommationLitresParHeure,
          driver.chronoSecondes,
        );
        if (
          driver.consommationLitresParTour === nextLpt &&
          driver.consommationEstimee === live.consommationEstimee
        ) {
          return driver;
        }
        changed = true;
        return {
          ...driver,
          consommationLitresParTour: nextLpt,
          consommationEstimee: live.consommationEstimee,
        };
      });
    }
  }

  if (live.connected && live.trackName && !raceSettings.circuitId && !raceSettings.circuit) {
    const match = findCatalogEntryByLabel(IRACING_TRACKS, live.trackName);
    applyRace({
      circuitId: match?.id ?? "",
      circuit: match?.label ?? live.trackName,
    });
  }

  if (live.connected && live.carName && !raceSettings.voitureId && !raceSettings.voiture) {
    const match = findCatalogEntryByLabel(IRACING_CARS, live.carName);
    applyRace({
      voitureId: match?.id ?? "",
      voiture: match?.label ?? live.carName,
    });
  }

  if (!changed) return { next: plan, changed: false };
  return { next: { ...plan, raceSettings, drivers }, changed: true };
}

export function useEndurancePlan() {
  const live = useEnduranceLiveSession();
  const [plan, setPlan] = useState<EndurancePlan | null>(null);
  const [page, setPage] = useState<EndurancePageId>("setup");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressCollabPush = useRef(false);

  const scheduleSave = useCallback((next: EndurancePlan) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaving(true);
      void storage.save(next).finally(() => setSaving(false));
    }, 400);
  }, []);

  const applyRemotePlan = useCallback(
    (remotePlan: EndurancePlan) => {
      suppressCollabPush.current = true;
      setPlan(remotePlan);
      scheduleSave(remotePlan);
      suppressCollabPush.current = false;
    },
    [scheduleSave],
  );

  const collab = useCollaboration({
    plan,
    onRemotePlan: applyRemotePlan,
  });

  const pushToCollab = useCallback(
    (next: EndurancePlan) => {
      if (suppressCollabPush.current || !collab.session.active) return;
      collab.pushPlan(next);
    },
    [collab],
  );

  useEffect(() => {
    void storage.load().then((loaded) => {
      setPlan(loaded);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setPlan((prev) => {
      if (!prev) return prev;
      const { next, changed } = mergeLiveIntoPlan(prev, live);
      if (!changed) return prev;
      scheduleSave(next);
      pushToCollab(next);
      return next;
    });
  }, [
    live.connected,
    live.isPractice,
    live.pitDurationSec,
    live.pitTimeEstimated,
    live.capaciteReservoirLitres,
    live.consommationLitresParHeure,
    live.consommationEstimee,
    live.trackName,
    live.carName,
    scheduleSave,
    pushToCollab,
  ]);

  const updatePlan = useCallback(
    (patch: Partial<EndurancePlan>) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        scheduleSave(next);
        pushToCollab(next);
        return next;
      });
    },
    [scheduleSave, pushToCollab],
  );

  const setRaceSettings = useCallback(
    (raceSettings: RaceSettings) => updatePlan({ raceSettings }),
    [updatePlan],
  );

  const setDrivers = useCallback(
    (drivers: Driver[]) => updatePlan({ drivers }),
    [updatePlan],
  );

  const generate = useCallback(() => {
    setPlan((prev) => {
      if (!prev) return prev;
      const strategy: Strategy = generateStrategy({
        raceSettings: prev.raceSettings,
        drivers: prev.drivers,
      });
      const next = {
        ...prev,
        strategy,
        strategyValidatedAt: null,
      };
      scheduleSave(next);
      pushToCollab(next);
      return next;
    });
    setPage("strategy");
  }, [scheduleSave, pushToCollab]);

  const validateStrategy = useCallback(() => {
    setPlan((prev) => {
      if (!prev?.strategy) return prev;
      if (!canValidateStrategyForLive(prev.raceSettings, prev.strategy)) {
        return prev;
      }
      const next = {
        ...prev,
        strategyValidatedAt: new Date().toISOString(),
      };
      scheduleSave(next);
      pushToCollab(next);
      setPage("live");
      return next;
    });
  }, [scheduleSave, pushToCollab]);

  const exportStrategyPdf = useCallback(async () => {
    const current = plan;
    if (!current?.strategy) return;
    const html = buildStrategyPdfHtml(current);
    const circuit = current.raceSettings.circuit || "course";
    const date = current.raceSettings.date;
    const filename = `strategie-${circuit.replace(/\s+/g, "-").toLowerCase()}-${date}.pdf`;

    if (window.ath?.endurance?.exportStrategyPdf) {
      await window.ath.endurance.exportStrategyPdf(html, filename);
      return;
    }

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  }, [plan]);

  const updateStrategyRelais = useCallback(
    (relais: Stint[]) => {
      setPlan((prev) => {
        if (!prev?.strategy) return prev;
        const strategy = recalculerStrategie(prev.raceSettings, prev.drivers, {
          ...prev.strategy,
          relais,
        });
        const next = { ...prev, strategy };
        scheduleSave(next);
        pushToCollab(next);
        return next;
      });
    },
    [scheduleSave, pushToCollab],
  );

  const editSetup = canEditSetup(collab.effectiveRole);
  const editStrategy = canEditStrategy(collab.effectiveRole);

  return {
    plan,
    page,
    setPage,
    loading,
    saving,
    live,
    collab,
    editSetup,
    editStrategy,
    setRaceSettings,
    setDrivers,
    generate,
    updateStrategyRelais,
    validateStrategy,
    exportStrategyPdf,
  };
}
