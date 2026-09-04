import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { createConnection } from "node:net";
import { app } from "electron";

const DEFAULT_PORT = 4177;

function relayScriptPath(): string {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "collaboration-relay",
      "server.mjs",
    );
  }
  return path.join(app.getAppPath(), "collaboration-relay", "server.mjs");
}

function relayCwd(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked");
  }
  return app.getAppPath();
}

function isPortOpen(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      resolve(false);
    });
  });
}

/**
 * Démarre le relais WebSocket local (collaboration-relay) si besoin.
 * Utilisé pour le mode « À distance » sans serveur cloud.
 */
export class LocalCollabRelay {
  private child: ChildProcess | null = null;
  private port = DEFAULT_PORT;

  getPort(): number {
    return this.port;
  }

  getWsUrl(): string {
    return `ws://127.0.0.1:${this.port}`;
  }

  async ensureRunning(): Promise<{ url: string; port: number }> {
    if (await isPortOpen(this.port)) {
      return { url: this.getWsUrl(), port: this.port };
    }

    if (this.child && !this.child.killed) {
      await this.waitUntilOpen(8000);
      return { url: this.getWsUrl(), port: this.port };
    }

    const script = relayScriptPath();
    this.child = spawn(process.execPath, [script], {
      cwd: relayCwd(),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: "1",
        PORT: String(this.port),
        HOST: "0.0.0.0",
      },
      stdio: "ignore",
      windowsHide: true,
    });

    this.child.on("exit", () => {
      this.child = null;
    });

    const ok = await this.waitUntilOpen(8000);
    if (!ok) {
      this.stop();
      throw new Error("Impossible de démarrer le relais local");
    }

    return { url: this.getWsUrl(), port: this.port };
  }

  private waitUntilOpen(timeoutMs: number): Promise<boolean> {
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = async () => {
        if (await isPortOpen(this.port)) {
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(() => {
          void tick();
        }, 200);
      };
      void tick();
    });
  }

  stop(): void {
    if (this.child && !this.child.killed) {
      this.child.kill();
    }
    this.child = null;
  }
}
