export function renderBetaAdminHtml(users, token) {
  const rows = users
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.displayName)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(formatDate(row.registeredAt))}</td>
        <td>${escapeHtml(row.appVersion || "—")}</td>
        <td>${escapeHtml(row.platform || "—")}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RaceWolf — inscrits Beta</title>
  <style>
    :root { --accent:#9146ff; --bg:#07080c; --ink:#f4f6fb; --muted:#9aa3b5; --line:rgba(255,255,255,.08); }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Segoe UI,system-ui,sans-serif; background:var(--bg); color:var(--ink); }
    main { max-width:960px; margin:0 auto; padding:2rem 1.25rem 4rem; }
    h1 { font-size:1.6rem; letter-spacing:-.03em; }
    p { color:var(--muted); }
    .bar { display:flex; flex-wrap:wrap; gap:.75rem; align-items:center; justify-content:space-between; margin:1.25rem 0; }
    a.btn { color:#fff; text-decoration:none; background:var(--accent); padding:.55rem .9rem; border-radius:999px; font-weight:700; font-size:.85rem; }
    table { width:100%; border-collapse:collapse; background:rgba(255,255,255,.03); border:1px solid var(--line); border-radius:12px; overflow:hidden; }
    th, td { text-align:left; padding:.7rem .8rem; font-size:.9rem; border-bottom:1px solid var(--line); }
    th { color:#c4b5fd; font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; }
    .empty { padding:1.5rem; color:var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>Inscrits Beta</h1>
    <p>${users.length} testeur${users.length > 1 ? "s" : ""} avec e-mail — tarif fondateur.</p>
    <div class="bar">
      <a class="btn" href="/beta.csv?token=${encodeURIComponent(token)}">Télécharger CSV</a>
    </div>
    ${
      users.length
        ? `<table>
      <thead><tr><th>Nom</th><th>E-mail</th><th>Inscription</th><th>Version</th><th>OS</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`
        : `<p class="empty">Personne n’est encore inscrit. Les inscriptions arrivent quand un testeur clique « S’inscrire à la Beta » dans l’app, avec le relais allumé.</p>`
    }
  </main>
</body>
</html>`;
}

export function renderBetaLoginHtml() {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>RaceWolf — accès liste Beta</title>
  <style>
    body { font-family:Segoe UI,system-ui,sans-serif; background:#07080c; color:#f4f6fb; display:grid; place-items:center; min-height:100vh; margin:0; }
    form { display:flex; flex-direction:column; gap:.7rem; width:min(22rem,90vw); }
    input, button { padding:.7rem .8rem; border-radius:10px; border:1px solid rgba(145,70,255,.35); background:#0c1018; color:inherit; font:inherit; }
    button { background:#9146ff; border:none; font-weight:700; cursor:pointer; }
    p { color:#9aa3b5; font-size:.9rem; }
  </style>
</head>
<body>
  <form method="get" action="/beta">
    <h1>Liste Beta</h1>
    <p>Entrez le jeton admin (variable BETA_ADMIN_TOKEN).</p>
    <input type="password" name="token" placeholder="Jeton" required />
    <button type="submit">Ouvrir</button>
  </form>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "—";
  return d.toLocaleString("fr-FR");
}
