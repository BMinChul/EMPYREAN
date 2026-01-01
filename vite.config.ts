import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["lucide-react"],
    include: ["react", "react-dom", "@privy-io/react-auth", "@tanstack/react-query", "phaser", "zustand"],
  },
  server: {
    host: true,
  },
  base: "./",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1000kb
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          react: ["react", "react-dom"],
          vendor: ["zustand", "@agent8/gameserver"],
        },
      },
    },
  },
});
