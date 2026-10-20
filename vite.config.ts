import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH is set to /<repo>/ when deploying to GitHub Pages.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
  },
  server: {
    port: 5173,
  },
});
