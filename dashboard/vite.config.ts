import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Dashboard build config.
 *
 * Run from the repository root:
 *   npm run dev:dashboard     -> http://localhost:5173 (hot reload)
 *   npm run build:dashboard   -> dashboard/dist (static files)
 *
 * The API origin is configurable with VITE_API_URL (defaults to the Ponder
 * server on http://localhost:42069). Ponder enables permissive CORS, so the
 * Vite dev server can call the API cross-origin without a proxy.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
