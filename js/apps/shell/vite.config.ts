import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@money/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@money/plans": path.resolve(__dirname, "../../packages/app-plans/src/index.ts"),
    },
  },
  server: {
    // host defaults to 127.0.0.1 (loopback); override with --host flag or VITE_HOST env var when needed
    port: 3002
  }
});
