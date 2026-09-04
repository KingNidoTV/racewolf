import type { AthBridge } from "./types/ipc";

declare global {
  interface Window {
    ath?: AthBridge;
  }
}

export {};
