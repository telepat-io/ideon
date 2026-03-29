import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: path.resolve(currentDir, 'src/preview-app'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(currentDir, 'dist/preview'),
    assetsDir: 'app-assets',
    // Keep existing files during watch rebuilds so the server never hits ENOENT
    // between the delete and write phases. A normal `build` still cleans properly.
    emptyOutDir: mode !== 'development',
  },
}));