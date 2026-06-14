import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ─── Global Error Handlers (before React mounts) ──────────────────────────
window.addEventListener('error', (event) => {
  console.error('[ZeroClaw] Runtime error:', event.error);
  const el = document.getElementById('loading-error');
  if (el) { el.textContent = 'Error: ' + (event.error?.message || 'Unknown error'); el.style.display = 'block'; }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[ZeroClaw] Unhandled rejection:', event.reason);
  const el = document.getElementById('loading-error');
  if (el && el.style.display !== 'block') {
    el.textContent = 'Error loading app. Try refreshing or clearing cache.';
    el.style.display = 'block';
  }
  event.preventDefault();
});

// Safety timeout: show error if React doesn't mount in 15s
setTimeout(() => {
  const root = document.getElementById('root');
  if (root && root.children.length === 0) {
    const el = document.getElementById('loading-error');
    if (el) { el.textContent = 'Timed out. Check console (F12) or try refreshing.'; el.style.display = 'block'; }
  }
}, 15000);

// ─── Mount React ──────────────────────────────────────────────────────────
const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('[ZeroClaw] #root element not found');
} else {
  const root = createRoot(rootEl);
  root.render(<App />);
}

// Hide loading screen after a brief delay to allow React to paint
setTimeout(() => {
  const fallback = document.getElementById('loading-fallback');
  if (fallback) { fallback.classList.add('fade-out'); setTimeout(() => fallback.remove(), 500); }
}, 800);

// ─── Lazy-start optional worker ───────────────────────────────────────────
try {
  setTimeout(async () => {
    const mod = await import('./services/memoryVectorizationWorker.ts').catch(() => null);
    if (mod && (mod as any).memoryVectorizationWorker) {
      try { (mod as any).memoryVectorizationWorker.start(); } catch (e) { /* non-critical */ }
    }
  }, 3000);
} catch (e) { /* non-critical */ }
