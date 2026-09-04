import type { EndurancePlan } from "../models";
import type { Driver } from "../models/Driver";
import { formatRaceDuration } from "../models/RaceSettings";
import { formatSecondsToClock } from "../engine";

function driverName(drivers: Driver[], id: string): string {
  return drivers.find((d) => d.id === id)?.nom ?? "—";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Génère le HTML imprimable de la stratégie (export PDF). */
export function buildStrategyPdfHtml(plan: EndurancePlan): string {
  const { raceSettings, drivers, strategy } = plan;
  if (!strategy) {
    return "<html><body><p>Aucune stratégie</p></body></html>";
  }

  const rows = strategy.relais
    .map(
      (stint) => `
      <tr>
        <td>${stint.numero}</td>
        <td>${escapeHtml(stint.heureDebut)}</td>
        <td>${escapeHtml(stint.heureFin)}</td>
        <td>${escapeHtml(driverName(drivers, stint.piloteId))}</td>
        <td>${stint.toursPrevus}</td>
        <td>${stint.carburantUtiliseLitres > 0 ? `${stint.carburantUtiliseLitres.toFixed(1)} L` : "—"}</td>
        <td>${stint.changementPneus ? "Oui" : "—"}</td>
        <td>${formatSecondsToClock(stint.dureeSecondes)}</td>
      </tr>`,
    )
    .join("");

  const titre = [
    raceSettings.circuit || "Course endurance",
    formatRaceDuration(raceSettings),
    raceSettings.voiture,
  ]
    .filter(Boolean)
    .join(" — ");

  const validated = plan.strategyValidatedAt
    ? `<p class="meta">Validée le ${new Date(plan.strategyValidatedAt).toLocaleString("fr-FR")}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Stratégie — ${escapeHtml(titre)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", Arial, sans-serif; font-size: 11pt; color: #111; margin: 24px; }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .meta { color: #444; margin: 0 0 16px; font-size: 10pt; }
    .summary { margin-bottom: 16px; font-size: 10pt; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #eee; font-weight: 600; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .footer { margin-top: 20px; font-size: 9pt; color: #666; }
  </style>
</head>
<body>
  <h1>Planning stratégie</h1>
  <p class="meta">${escapeHtml(titre)}</p>
  ${validated}
  <div class="summary">
    <strong>${strategy.nombreRelaisTotal}</strong> relais —
    <strong>${strategy.toursTotaux}</strong> tours —
    carburant ${strategy.carburantTotalLitres.toFixed(1)} L
  </div>
  <table>
    <thead>
      <tr>
        <th>Stint</th>
        <th>Début</th>
        <th>Fin</th>
        <th>Pilote</th>
        <th>Tours</th>
        <th>Carburant</th>
        <th>Pneus</th>
        <th>Durée</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">RaceWolf — généré le ${new Date().toLocaleString("fr-FR")}</p>
</body>
</html>`;
}
