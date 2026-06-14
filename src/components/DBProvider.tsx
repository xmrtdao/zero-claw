import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface DBContextValue {
  ready: boolean;
  error: string | null;
}

const DBContext = createContext<DBContextValue>({ ready: false, error: null });

export function useDB() {
  return useContext(DBContext);
}

function LoadingFallback() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#06060a',
      zIndex: 9999
    }}>
      <div style={{
        width: 48, height: 48, border: '2px solid rgba(139,92,246,0.2)',
        borderTopColor: '#8b5cf6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', marginBottom: 20
      }} />
      <h1 style={{
        fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px',
        background: 'linear-gradient(135deg, #fff 0%, #8b5cf6 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 8
      }}>ZeroClaw</h1>
      <p style={{ fontSize: 14, color: '#64748b' }}>Initializing database...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function DBProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const { initDB } = await import('@/db/sqlite');
        await initDB();
        if (!cancelled) setReady(true);
      } catch (err: any) {
        console.error('[DBProvider] Init failed:', err);
        if (!cancelled) {
          setError(err?.message || 'Database init failed');
          setReady(true); // Still render the app
        }
      }
    }

    boot();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <LoadingFallback />;

  return (
    <DBContext.Provider value={{ ready, error }}>
      {children}
      {error && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          maxWidth: 380, background: '#0f172a', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 8, padding: 16
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>Database offline</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{error}</div>
        </div>
      )}
    </DBContext.Provider>
  );
}
