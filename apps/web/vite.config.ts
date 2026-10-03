import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { workspaceAliases } from "../../tooling.shared";

export default defineConfig({
  plugins: [react()],
  envPrefix: "VITE_",
  resolve: {
    alias: workspaceAliases,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
  build: {
    sourcemap: false,
  },
});
