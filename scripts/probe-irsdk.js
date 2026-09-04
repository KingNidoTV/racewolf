/**
 * Test rapide SDK iRacing (lancer pendant qu'iRacing est ouvert).
 *   node scripts/probe-irsdk.js
 */
const { IRacingSDK } = require("irsdk-node");
const { sdkIsMocked } = require("@irsdk-node/native");

async function main() {
  console.log("sdkIsMocked:", sdkIsMocked);
  if (sdkIsMocked) {
    console.error("Module natif absent — npm run install:electron");
    process.exit(2);
  }

  const httpRunning = await IRacingSDK.IsSimRunning();
  console.log("HTTP sim (port 32034):", httpRunning ? "running" : "off");

  const sdk = new IRacingSDK({ autoEnableTelemetry: false });
  console.log("startSDK():", sdk.startSDK());
  console.log("sessionStatusOK (avant frame):", sdk.sessionStatusOK);

  for (let i = 0; i < 40; i++) {
    sdk.startSDK();
    const ok = sdk.waitForData(100);
    console.log(
      "tick",
      i,
      "waitForData:",
      ok,
      "sessionStatusOK:",
      sdk.sessionStatusOK,
    );
    if (ok) {
      const t = sdk.getTelemetry();
      const keys = t ? Object.keys(t).length : 0;
      console.log("OK vars:", keys, "Speed:", t?.Speed?.value?.[0]);
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, 30));
  }

  console.log("Aucune frame — télémétrie iRacing ou binaire SDK Electron.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
