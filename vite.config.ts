import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In local dev, /api/* is forwarded to the relay server (server/index.js).
      "/api": { target: "http://localhost:8787", changeOrigin: true }
    }
  }
});
