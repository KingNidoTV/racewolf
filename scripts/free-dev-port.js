/**
 * Libère le port Vite (5173) si une ancienne instance tourne encore.
 */
const { execSync } = require("child_process");

const PORT = 5173;

function freePortWindows() {
  let out = "";
  try {
    out = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8" });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      console.log(`[RaceWolf] Port ${PORT} libere (PID ${pid})`);
    } catch {
      // process already gone
    }
  }
}

if (process.platform === "win32") {
  freePortWindows();
}
