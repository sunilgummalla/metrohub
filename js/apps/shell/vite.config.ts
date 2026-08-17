import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig(({ mode }) => {
  // Resolve VITE_API_TARGET from .env* files (and the OS env) so the dev proxy
  // target is configurable locally, e.g. VITE_API_TARGET in .env.local. The
  // "VITE_" prefix matches Vite's standard env filtering.
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiTarget = env.VITE_API_TARGET || "http://127.0.0.1:3000";
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@metrohub/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
        "@metrohub/plans": path.resolve(__dirname, "../../packages/app-plans/src/index.ts"),
        "@metrohub/marketplace": path.resolve(__dirname, "../../packages/app-marketplace/src/index.ts"),
        "@metrohub/housing-loan": path.resolve(__dirname, "../../packages/app-housing-loan/src/index.ts"),
        "@metrohub/raffle": path.resolve(__dirname, "../../packages/app-raffle/src/index.ts"),
        "@metrohub/events": path.resolve(__dirname, "../../packages/app-events/src/index.ts"),
      },
    },
    server: {
      // host defaults to 127.0.0.1 (loopback); override with --host flag or VITE_HOST env var when needed
      port: 3002,
      // Proxy /api to the local NestJS API in dev. In prod, nginx proxies /api → api:3000.
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
