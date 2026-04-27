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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
