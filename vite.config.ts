import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' позволяет деплоить как на бесплатный домен (GitHub Student Pack),
// так и на GitHub Pages в подпапку репозитория без поломок путей.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});

