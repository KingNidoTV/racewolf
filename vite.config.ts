import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        overlay: path.resolve(__dirname, "index.html"),
        launcher: path.resolve(__dirname, "launcher.html"),
        endurance: path.resolve(__dirname, "endurance.html"),
      },
    },
  },
});
