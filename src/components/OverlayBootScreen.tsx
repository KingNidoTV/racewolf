/** Affiché brièvement si les données ne sont pas encore prêtes. */
export function OverlayBootScreen() {
  return (
    <div className="overlay-boot">
      <span className="overlay-boot__logo">RaceWolf</span>
      <span className="overlay-boot__text">Chargement overlay…</span>
    </div>
  );
}
