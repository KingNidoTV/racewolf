/**
 * Capture Pit Crew (préparation + stratégie) en pleine largeur.
 * Usage: electron scripts/capture-pitcrew-screens.js
 */
const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const OUT_DIR = path.join(__dirname, "../docs/screenshots");
const WEB_DIR = path.join(__dirname, "../website/assets/screenshots");
const W = 1600;
const H = 960;

const DEMO_PLAN = {
  raceSettings: {
    date: "2026-08-16",
    startTime: "14:00",
    dureeType: "time",
    durationMinutes: 360,
    durationLaps: 120,
    circuitId: "road-atlanta-full-course",
    circuit: "Road Atlanta — Full Course",
    voitureId: "ferrari-296-gt3",
    voiture: "Ferrari 296 GT3",
    tempsPitMoyenSecondes: 93,
    tempsPitEstime: true,
    capaciteReservoirLitres: 100,
    capaciteReservoirEstimee: true,
    nombreTrainsPneus: 3,
    trainsPneusIllimites: false,
  },
  drivers: [
    {
      id: "d0",
      nom: "Pilote 1",
      couleur: "#3b82f6",
      chronoSecondes: 105,
      consommationLitresParTour: 1,
      consommationEstimee: true,
      relaisMax: 99,
      doubleRelaisAutorise: false,
      absences: [],
    },
    {
      id: "d1",
      nom: "Pilote 2",
      couleur: "#22c55e",
      chronoSecondes: 105,
      consommationLitresParTour: 1,
      consommationEstimee: true,
      relaisMax: 99,
      doubleRelaisAutorise: false,
      absences: [],
    },
    {
      id: "d2",
      nom: "Pilote 3",
      couleur: "#f97316",
      chronoSecondes: 105,
      consommationLitresParTour: 1,
      consommationEstimee: true,
      relaisMax: 99,
      doubleRelaisAutorise: false,
      absences: [],
    },
  ],
  strategy: null,
  strategyValidatedAt: null,
};

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForApp(win) {
  for (let i = 0; i < 50; i++) {
    const ok = await win.webContents.executeJavaScript(`
      Boolean(document.querySelector('.endurance-app') &&
        !document.querySelector('.endurance-app--loading'))
    `);
    if (ok) return;
    await sleep(200);
  }
}

async function snap(win, fileName) {
  await win.showInactive?.();
  await win.show();
  win.focus();
  await sleep(400);
  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
    })
  `);

  let buf = null;
  try {
    const dbg = win.webContents.debugger;
    if (!dbg.isAttached()) dbg.attach("1.3");
    const { data } = await dbg.sendCommand("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    buf = Buffer.from(data, "base64");
  } catch (err) {
    console.warn("CDP capture failed, fallback:", err.message);
    const image = await win.capturePage();
    if (image.isEmpty()) throw new Error("capture vide pour " + fileName);
    buf = image.toPNG();
  }

  const out = path.join(OUT_DIR, fileName);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(WEB_DIR, { recursive: true });
  fs.writeFileSync(out, buf);
  fs.copyFileSync(out, path.join(WEB_DIR, fileName));
  const meta = await require("sharp")(buf).metadata();
  console.log("OK", fileName, meta.width, "x", meta.height);
}

async function main() {
  try {
    const tracks = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../src/endurance/data/tracks.json"),
        "utf8",
      ),
    );
    const list = tracks.tracks || tracks;
    const atlanta = list.find((t) => /road atlanta.*full/i.test(t.label || ""));
    if (atlanta) {
      DEMO_PLAN.raceSettings.circuitId = atlanta.id;
      DEMO_PLAN.raceSettings.circuit = atlanta.label;
    }
  } catch {
    /* ignore */
  }

  await app.whenReady();

  const win = new BrowserWindow({
    width: W,
    height: H,
    show: true,
    useContentSize: true,
    backgroundColor: "#0f1419",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  const distHtml = path.join(__dirname, "../dist/endurance.html");
  if (!fs.existsSync(distHtml)) {
    console.error("Manque dist/endurance.html — npm run build");
    app.exit(1);
    return;
  }

  await win.loadFile(distHtml);
  await win.webContents.executeJavaScript(
    `localStorage.setItem('endurance-plan-v1', ${JSON.stringify(
      JSON.stringify(DEMO_PLAN),
    )}); location.reload();`,
  );
  await sleep(500);
  await waitForApp(win);
  await sleep(800);

  await snap(win, "racewolf-04-pitcrew-preparation.png");

  await win.webContents.executeJavaScript(`
    (async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const gen = [...document.querySelectorAll('button')]
        .find((b) => /g[ée]n[ée]rer/i.test(b.textContent || ''));
      gen?.click();
      await sleep(1600);
      const strat = [...document.querySelectorAll('button')]
        .find((b) => /\\bstrat[ée]gie\\b/i.test(b.textContent || '') &&
          !/g[ée]n[ée]rer/i.test(b.textContent || ''));
      strat?.click();
      await sleep(900);
      return document.querySelector('table') ? 'table-ok' : 'no-table';
    })()
  `);
  await sleep(500);
  await snap(win, "racewolf-05-pitcrew-strategie.png");

  win.destroy();
  app.quit();
}

main().catch((err) => {
  console.error(err);
  app.exit(1);
});
