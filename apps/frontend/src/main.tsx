import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { App } from './App';
import './styles/globals.css';
// highlight.js theme for code blocks. Atom One Dark pairs with the
// VSCode-style code surfaces in the docs panel and the live answer view.
import 'highlight.js/styles/atom-one-dark.css';
import { bootstrapTheme } from './hooks/useTheme';

// Apply the persisted theme synchronously, before React paints, so the
// page never flashes the wrong substrate.
bootstrapTheme();

// Tag the body when running inside the Electron desktop build so CSS can
// add a drag region and exempt interactive elements without each component
// having to detect Electron individually. macOS uses titleBarStyle:
// 'hiddenInset', so we get a slim drag strip at the top; Windows / Linux
// use a slightly taller strip behind the titleBarOverlay symbol color.
if (typeof window !== 'undefined') {
  const camo = (window as any).camo;
  if (camo?.isDesktop) {
    document.body.classList.add('electron-desktop');
    if (camo.platform === 'darwin') document.body.classList.add('electron-mac');
    else document.body.classList.add('electron-win');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
