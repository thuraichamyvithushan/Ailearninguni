import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { deploymentConfig } from "../deployment.config.js";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@firebase")) return "firebase-auth";
            if (
              id.includes("framer-motion") ||
              id.includes("motion-dom") ||
              id.includes("motion-utils")
            )
              return "motion";
            if (
              id.includes("react-dom") ||
              id.includes("react-router") ||
              /[/\\]react[/\\]/.test(id)
            )
              return "react";
          }
        },
      },
    },
  },
  server: {
    host: "localhost",
    port: Number(new URL(deploymentConfig.local.frontendUrl).port),
    strictPort: true,
    proxy: { "/api": deploymentConfig.local.backendUrl },
  },
  preview: {
    host: "localhost",
    port: Number(new URL(deploymentConfig.local.previewUrl).port),
    strictPort: true,
  },
});
