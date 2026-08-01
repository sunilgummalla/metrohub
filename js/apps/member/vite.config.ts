import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@metrohub/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    port: 3003,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
