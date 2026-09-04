/**
 * Recensement Beta : chaque inscription (nom + e-mail) t’envoie un mail.
 * Première fois : FormSubmit t’envoie un lien de confirmation — clique-le une fois.
 *
 * Change BETA_NOTIFY_EMAIL si tu veux une autre boîte.
 */
export const BETA_NOTIFY_EMAIL =
  process.env.RACEWOLF_BETA_NOTIFY_EMAIL?.trim() ||
  "h24sallin@hotmail.com";

export function getBetaRegisterUrl(): string {
  const override = process.env.RACEWOLF_BETA_REGISTER_URL?.trim();
  if (override) return override;
  return `https://formsubmit.co/ajax/${encodeURIComponent(BETA_NOTIFY_EMAIL)}`;
}
