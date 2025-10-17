import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../soof-extension/extensions/agent/assets",
    assetsDir: ".",
    emptyOutDir: true,
    rollupOptions: {
      input: "./src/main.tsx",
      output: {
        entryFileNames: "lt-agent-extension.js",
        assetFileNames: "lt-agent-[name][extname]",
      },
    },
  },
});
