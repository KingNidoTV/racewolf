import type { EndurancePlan } from "../models";
import type { LiveTelemetryPatch, LiveTelemetryProvider } from "./LiveTelemetryProvider";
import {
  DEFAULT_LIVE_RECALC_STATE,
  appliquerDeclencheurRecalcul,
  recalculerStrategieLive,
  type LiveRecalcState,
} from "./recalculateLiveStrategy";
import type { LiveRaceSnapshot, LiveRecalcTrigger } from "./models";
import { DEFAULT_LIVE_RACE_SNAPSHOT } from "./models";
import { MockLiveTelemetryProvider } from "./MockLiveTelemetryProvider";
import { IracingSdkLiveTelemetryProvider } from "./IracingSdkLiveTelemetryProvider";
import {
  createLiveEventDetectorState,
  detectLiveRecalcEvents,
} from "./detectLiveEvents";
import {
  createLiveDeltaState,
  enrichLiveDeltas,
  type LiveDeltaState,
} from "./enrichLiveDeltas";

type SnapshotListener = (snapshot: LiveRaceSnapshot) => void;

/**
 * Hub central : reçoit les mises à jour télémétrie, déclenche les recalculs
 * et diffuse un snapshot unifié aux abonnés UI.
 */
export class LiveTelemetryHub {
  private provider: LiveTelemetryProvider | null = null;
  private snapshot: LiveRaceSnapshot = structuredClone(DEFAULT_LIVE_RACE_SNAPSHOT);
  private listeners = new Set<SnapshotListener>();
  private plan: EndurancePlan | null = null;
  private recalcState: LiveRecalcState = { ...DEFAULT_LIVE_RECALC_STATE };
  private eventDetectorState = createLiveEventDetectorState();
  private deltaState: LiveDeltaState = createLiveDeltaState();
  private running = false;
  private preferSdk = true;

  setPlan(plan: EndurancePlan | null): void {
    this.plan = plan;
    if (this.provider instanceof MockLiveTelemetryProvider) {
      this.provider.bindPlan(plan);
    }
    if (plan?.strategy) {
      this.runRecalc("initial");
    }
  }

  /** Mock par défaut ; SDK branché plus tard via setProvider. */
  useMockProvider(): void {
    this.setProvider(new MockLiveTelemetryProvider());
  }

  useSdkProvider(): void {
    this.setProvider(new IracingSdkLiveTelemetryProvider());
  }

  setProvider(provider: LiveTelemetryProvider | null): void {
    if (this.provider) {
      this.provider.stop();
    }
    this.provider = provider;
  }

  start(options?: { useMock?: boolean }): void {
    if (this.running) return;
    this.running = true;

    const sdkAvailable =
      typeof window !== "undefined" &&
      Boolean(window.ath?.endurance?.onLiveRace);
    const useMock =
      options?.useMock ?? (!this.preferSdk || !sdkAvailable);

    if (useMock) {
      this.useMockProvider();
    } else {
      this.useSdkProvider();
    }

    if (this.provider instanceof MockLiveTelemetryProvider) {
      this.provider.bindPlan(this.plan);
    }
    void this.provider?.start((patch) => this.ingestPatch(patch));
    if (this.provider) {
      this.mergeSnapshot(this.provider.getSnapshot());
    }
    this.enrichStintFromPlan();
    this.runRecalc("initial");
    this.notify();
  }

  stop(): void {
    this.running = false;
    this.provider?.stop();
    this.deltaState = createLiveDeltaState();
  }

  /** Force une reconnexion au fournisseur (ex. après ouverture de l'onglet Live). */
  restart(): void {
    this.stop();
    this.start();
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): LiveRaceSnapshot {
    return structuredClone(this.snapshot);
  }

  /** Déclenche un recalcul manuel ou simulé (réparation, SC, météo). */
  triggerRecalc(trigger: LiveRecalcTrigger, payload?: import("./liveEvents").LiveRecalcPayload): void {
    this.recalcState = appliquerDeclencheurRecalcul(this.recalcState, trigger, payload);
    if (trigger === "safety_car") {
      this.ingestPatch({
        session: { flag: "safety_car" },
      });
    }
    if (trigger === "weather_change" && payload?.weather) {
      this.ingestPatch({
        session: {
          weather: payload.weather,
          rainIntensityPercent:
            payload.weather === "humide" ? 80 : payload.weather === "mixte" ? 40 : 0,
        },
      });
    }
    this.runRecalc(trigger);
    this.notify();
  }

  private ingestPatch(patch: LiveTelemetryPatch): void {
    const prev = structuredClone(this.snapshot);

    if (patch.session) {
      this.snapshot.session = {
        ...this.snapshot.session,
        ...patch.session,
        updatedAt: new Date().toISOString(),
      };
    }
    if (patch.stint) {
      this.snapshot.stint = { ...this.snapshot.stint, ...patch.stint };
    }
    if (patch.fuel) {
      this.snapshot.fuel = { ...this.snapshot.fuel, ...patch.fuel };
    }

    let detectedEvents: ReturnType<typeof detectLiveRecalcEvents>["events"] = [];
    if (this.snapshot.session.source === "sdk") {
      const { events, state } = detectLiveRecalcEvents(
        prev,
        this.snapshot,
        this.eventDetectorState,
      );
      this.eventDetectorState = state;
      detectedEvents = events;
      for (const event of events) {
        this.recalcState = appliquerDeclencheurRecalcul(
          this.recalcState,
          event.trigger,
          event.payload,
        );
        this.runRecalc(event.trigger);
      }
    }

    if (detectedEvents.length === 0) {
      this.runRecalc("stint_update");
    }

    this.enrichStintFromPlan();
    this.notify();
  }

  private enrichStintFromPlan(): void {
    if (!this.plan?.strategy) return;

    const relais =
      this.snapshot.strategy.relaisProjete.length > 0
        ? this.snapshot.strategy.relaisProjete
        : this.plan.strategy.relais;

    const sdkStintIndex = this.snapshot.stint.sdkStintIndex ?? this.snapshot.stint.numeroRelais;
    const idx = Math.max(
      0,
      Math.min(relais.length - 1, sdkStintIndex - 1),
    );
    const planned = relais[idx];
    if (!planned) return;

    let piloteId = planned.piloteId;
    const sdkName = this.snapshot.stint.piloteNom?.toLowerCase();
    if (sdkName) {
      const match = this.plan.drivers.find(
        (d) => d.nom.toLowerCase() === sdkName,
      );
      if (match) piloteId = match.id;
    }

    const toursCompletes = this.snapshot.stint.toursCompletes;
    this.snapshot.stint = {
      ...this.snapshot.stint,
      numeroRelais: planned.numero,
      sdkStintIndex,
      piloteId,
      toursPrevus: planned.toursPrevus,
      toursRestants: Math.max(0, planned.toursPrevus - toursCompletes),
      changementPneusPrevu: planned.changementPneus,
      dureePrevueSec: planned.dureeSecondes,
    };

    if (this.plan.drivers.length > 0) {
      const enriched = enrichLiveDeltas(
        this.snapshot.stint,
        this.snapshot.fuel,
        this.plan.drivers,
        this.deltaState,
      );
      this.snapshot.stint = enriched.stint;
      this.snapshot.fuel = enriched.fuel;
      this.deltaState = enriched.state;
    }
  }

  private mergeSnapshot(full: LiveRaceSnapshot): void {
    this.snapshot = {
      session: { ...this.snapshot.session, ...full.session },
      stint: { ...this.snapshot.stint, ...full.stint },
      fuel: { ...this.snapshot.fuel, ...full.fuel },
      strategy: full.strategy,
    };
  }

  private runRecalc(trigger: LiveRecalcTrigger): void {
    if (!this.plan) return;
    const { strategy } = recalculerStrategieLive(
      this.plan,
      this.snapshot,
      trigger,
      this.recalcState,
    );
    this.snapshot.strategy = strategy;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      // React ignore une mise à jour si la référence est identique (Object.is).
      // Le hub mute son état en interne : chaque abonné doit donc recevoir une
      // nouvelle référence à chaque trame.
      listener(this.getSnapshot());
    }
  }
}

/** Instance partagée pour l'application endurance. */
export const liveTelemetryHub = new LiveTelemetryHub();
