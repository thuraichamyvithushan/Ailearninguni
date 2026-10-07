import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://localhost:4000" },
  },
});
