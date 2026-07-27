import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    // host defaults to 127.0.0.1 (loopback); override with --host flag or VITE_HOST env var when needed
    port: 3002
  }
});
