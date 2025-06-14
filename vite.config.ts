import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../soof-extension/extensions/soof-chat/assets',
    assetsDir: '.',
    emptyOutDir: true,
    rollupOptions: {
      input: './src/main.tsx',
      output: {
        entryFileNames: 'soof-extension.js',
        assetFileNames: 'soof-[name][extname]',
      },
    },
  }
})
