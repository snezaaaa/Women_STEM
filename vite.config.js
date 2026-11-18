import { defineConfig } from 'vite';

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/
// The deploy workflow passes BASE_PATH=/<repo>/ automatically.
// `npm run dev` uses "/"; `npm run build` / `npm run preview` use the Pages path.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? process.env.BASE_PATH || '/Women_STEM/' : '/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
  server: { host: true },
}));
