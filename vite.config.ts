import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: ["unreproving-aurelio-unspuriously.ngrok-free.dev"],
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));