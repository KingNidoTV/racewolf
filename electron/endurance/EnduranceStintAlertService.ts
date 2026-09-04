import type { EndurancePlan } from "../../src/endurance/models";
import type { LiveRaceSnapshot } from "../../src/endurance/live/models";

/**
 * Détecte une seule fois la fin planifiée d'un relais.
 * Placé dans le process principal pour fonctionner même lorsque l'onglet Live
 * n'est pas affiché et pour ne pas dépendre du cycle de vie React.
 */
export class EnduranceStintAlertService {
  private plan: EndurancePlan | null = null;
  private planKey: string | null = null;
  private sessionUniqueId = -1;
  private sent = new Set<string>();

  setPlan(plan: EndurancePlan | null): void {
    const nextKey = plan?.strategyValidatedAt ?? null;
    if (nextKey !== this.planKey) this.sent.clear();
    this.planKey = nextKey;
    this.plan = plan;
  }

  tick(snapshot: LiveRaceSnapshot): string | null {
    const plan = this.plan;
    const sessionId = snapshot.session.sessionUniqueId;

    if (sessionId !== this.sessionUniqueId) {
      this.sessionUniqueId = sessionId;
      this.sent.clear();
    }

    if (
      !plan?.strategyValidatedAt ||
      !plan.strategy ||
      !snapshot.session.connected ||
      !snapshot.session.isRace ||
      snapshot.session.flag === "checkered" ||
      snapshot.stint.enPit
    ) {
      return null;
    }

    const current =
      snapshot.stint.sdkStintIndex ?? snapshot.stint.numeroRelais ?? 1;
    const active = plan.strategy.relais.find(
      (relais) => relais.numero === current,
    );
    const hasNext = plan.strategy.relais.some(
      (relais) => relais.numero > current,
    );
    if (!active || !hasNext || active.toursPrevus <= 0) return null;

    const remaining = Math.max(
      0,
      active.toursPrevus - snapshot.stint.toursCompletes,
    );
    if (remaining > 1) return null;

    const key = `${sessionId}:${plan.strategyValidatedAt}:${current}`;
    if (this.sent.has(key)) return null;
    this.sent.add(key);
    return "Box this lap — fin du relais planifié";
  }
}
