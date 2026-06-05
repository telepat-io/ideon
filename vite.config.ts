import { cpSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const avatarSource = path.resolve(currentDir, 'assets/avatar/ideon-avatar.webp');
const previewPublicDir = path.resolve(currentDir, 'src/preview-app/public');
const avatarPublicPath = path.join(previewPublicDir, 'ideon-avatar.webp');

function copyIdeonAvatarPlugin(): Plugin {
  return {
    name: 'copy-ideon-avatar',
    buildStart() {
      mkdirSync(previewPublicDir, { recursive: true });
      cpSync(avatarSource, avatarPublicPath);
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: path.resolve(currentDir, 'src/preview-app'),
  base: './',
  plugins: [copyIdeonAvatarPlugin(), react()],
  build: {
    outDir: path.resolve(currentDir, 'dist/preview'),
    assetsDir: 'app-assets',
    // Keep existing files during watch rebuilds so the server never hits ENOENT
    // between the delete and write phases. A normal `build` still cleans properly.
    emptyOutDir: mode !== 'development',
  },
}));