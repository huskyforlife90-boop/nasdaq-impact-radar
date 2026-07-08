import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds ONE self-contained HTML file (demo mode) that runs anywhere —
// double-click it locally or drop it on any static host.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: {
    "import.meta.env.VITE_DEMO_MODE": JSON.stringify("true"),
  },
  build: {
    outDir: "dist-standalone",
    emptyOutDir: true,
  },
});
