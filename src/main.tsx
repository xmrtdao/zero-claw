import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import './index.css'

// ─── Graceful Worker Startup ──────────────────────────────────────────────
// Wrap optional background worker startup to prevent it from blocking render
let workerStarted = false;
try {
  const { memoryVectorizationWorker } = await import('./services/memoryVectorizationWorker');
  // Defer worker start to not block initial render
  setTimeout(() => {
    try {
      memoryVectorizationWorker.start();
      workerStarted = true;
    } catch (e) {
      console.warn('[ZeroClaw] Background worker start failed (non-critical):', e);
    }
  }, 2000);
} catch (e) {
  console.warn('[ZeroClaw] Background worker module not available (non-critical):', e);
}

// ─── Global Error Handler ─────────────────────────────────────────────────
window.addEventListener('error', (event) => {
  console.error('[ZeroClaw] Runtime error:', event.error);
  if (window.__showLoadingError) {
    window.__showLoadingError('An error occurred loading the app. Please refresh the page.');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[ZeroClaw] Unhandled promise rejection:', event.reason);
});

// ─── Mount React App ──────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('[ZeroClaw] Root element #root not found');
  if (window.__showLoadingError) {
    window.__showLoadingError('Critical: Application mount point missing.');
  }
  throw new Error('Root element #root not found');
}

const root = createRoot(rootEl);
root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Hide loading screen once React has mounted
setTimeout(() => {
  if (window.__hideLoading) window.__hideLoading();
}, 100);

console.log('[ZeroClaw] App mounted. Worker started:', workerStarted);
