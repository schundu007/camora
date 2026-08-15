import { defineConfig } from 'vite';
import { execSync } from 'child_process';
import react from '@vitejs/plugin-react';
import path from 'path';

// Stamped into the bundle so "did the deploy reach me?" is answerable by
// looking at the screen instead of by grepping chunk hashes. A stale client
// shows a stale stamp; that is the whole point.
const BUILD_ID = (() => {
  // Vercel's build container has no .git, so `git rev-parse` fails there and
  // the stamp would read "dev" on the one build the user actually runs.
  // VERCEL_GIT_COMMIT_SHA is injected for exactly this.
  const fromCI = process.env.VERCEL_GIT_COMMIT_SHA;
  if (fromCI) return fromCI.slice(0, 8);
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
})();

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
  build: {
    // Modern evergreen browsers only — interview platform users are on
    // up-to-date browsers. Saves ~kb per chunk vs the default es2015
    // transpilation + drops some Babel-style helpers.
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Topic data files — large static datasets that DocsPage pulls in
          // and inflates the route chunk to 4MB+. Splitting each into its
          // own chunk lets the browser cache them independently and avoid
          // re-downloading the whole catalog on a single-topic edit.
          if (id.includes('/data/capra/topics/')) {
            const m = id.match(/\/topics\/([^/]+?)(?:\.\w+)?$/);
            if (m) return `topic-data-${m[1]}`;
          }
          if (id.includes('/data/capra/companies/')) return 'company-data';
          // Heavy vendors that aren't on the critical path
          if (id.includes('node_modules/cytoscape')) return 'vendor-cytoscape';
          if (id.includes('node_modules/katex')) return 'vendor-katex';
          if (id.includes('node_modules/jspdf')) return 'vendor-jspdf';
          if (id.includes('node_modules/pdfmake')) return 'vendor-pdfmake';
          if (id.includes('node_modules/highlight.js')) return 'vendor-highlight';
          if (id.includes('node_modules/framer-motion')) return 'vendor-framer';
          // React core stays in the entry chunk — wanted on first paint.
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api/v1/playground': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
      '/playground/ws': {
        target: 'ws://localhost:3010',
        ws: true,
        changeOrigin: true,
      },
      '/pg-ide': {
        target: 'http://localhost:3010',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
