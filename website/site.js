(function () {
  const cfg = window.RACEWOLF || {};
  const href = cfg.downloadUrl || "./downloads/RaceWolf-0.7.0-portable.exe";
  const version = cfg.version || "0.7.0";
  const size = cfg.sizeLabel || "";
  const fileName = cfg.fileName || href.split("/").pop();
  const platform = cfg.platform || "Windows";
  const feedbackEmail = cfg.feedbackEmail || "";

  document.querySelectorAll("#download-btn").forEach((el) => {
    el.setAttribute("href", href);
    el.setAttribute("download", fileName);
    el.textContent = `Télécharger RaceWolf ${version}`;
  });

  const meta = document.getElementById("download-meta");
  if (meta) {
    meta.textContent = size
      ? `v${version} · portable · ${size} · ${platform}`
      : `v${version} · portable · ${platform}`;
  }

  const form = document.getElementById("feedback-form");
  const typeEl = document.getElementById("feedback-type");
  const emailEl = document.getElementById("feedback-email");
  const messageEl = document.getElementById("feedback-message");
  const statusEl = document.getElementById("feedback-status");
  const mailtoLink = document.getElementById("feedback-mailto");
  const copyBtn = document.getElementById("feedback-copy");
  const bugPresetBtn = document.getElementById("feedback-bug-preset");

  function showStatus(text, kind) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = text;
    statusEl.className = `feedback-form__hint ${kind === "ok" ? "is-ok" : kind === "error" ? "is-error" : ""}`;
  }

  function buildReport() {
    const type = typeEl?.value === "bug" ? "Bug" : "Avis / suggestion";
    const userEmail = emailEl?.value.trim() || "non fourni";
    const message = messageEl?.value.trim() || "";
    const lines = [
      `Type : ${type}`,
      `Version RaceWolf : ${version}`,
      `E-mail testeur : ${userEmail}`,
      "",
      message,
    ];
    return {
      subject: `[RaceWolf Beta] ${type} — v${version}`,
      body: lines.join("\n"),
    };
  }

  if (mailtoLink) {
    if (feedbackEmail) {
      mailtoLink.textContent = feedbackEmail;
      mailtoLink.href = `mailto:${feedbackEmail}?subject=${encodeURIComponent("[RaceWolf Beta] Retour utilisateur")}`;
    } else {
      mailtoLink.textContent = "configurez feedbackEmail dans config.js";
      mailtoLink.removeAttribute("href");
    }
  }

  if (bugPresetBtn && typeEl && messageEl) {
    bugPresetBtn.addEventListener("click", () => {
      typeEl.value = "bug";
      messageEl.value = [
        "Étapes pour reproduire :",
        "1. ",
        "2. ",
        "",
        "Résultat attendu :",
        "",
        "Résultat observé :",
        "",
        "Windows :",
        "iRacing (oui/non) :",
        "Module (overlay / Pit Crew) :",
      ].join("\n");
      messageEl.focus();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const { subject, body } = buildReport();
      const text = `Sujet : ${subject}\n\n${body}`;
      try {
        await navigator.clipboard.writeText(text);
        showStatus("Message copié — collez-le dans votre mail ou Discord.", "ok");
      } catch {
        showStatus("Copie impossible : utilisez « Envoyer mon retour ».", "error");
      }
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!messageEl?.value.trim()) {
        showStatus("Ajoutez un message avant d’envoyer.", "error");
        messageEl?.focus();
        return;
      }
      if (!feedbackEmail) {
        showStatus(
          "E-mail de contact non configuré — utilisez « Copier le texte ».",
          "error",
        );
        return;
      }
      const { subject, body } = buildReport();
      const url = `mailto:${feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = url;
      showStatus(
        "Votre client mail devrait s’ouvrir. Sinon, utilisez « Copier le texte ».",
        "ok",
      );
    });
  }
})();
