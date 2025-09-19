import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../soof-extension/extensions/soof-chat/assets",
    assetsDir: ".",
    emptyOutDir: true,
    rollupOptions: {
      input: "./src/main.tsx",
      output: {
        entryFileNames: "soof-extension.js",
        assetFileNames: "soof-[name][extname]",
      },
    },
  },
});
