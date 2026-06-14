import { useState, useEffect } from "react";

export default function App() {
  const [status, setStatus] = useState("Loading...");
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Progressive feature check
    const checks = [
      "React mounted",
      `localStorage: ${!!window.localStorage}`,
      `sessionStorage: ${!!window.sessionStorage}`,
      `fetch: ${!!window.fetch}`,
      `crypto: ${!!window.crypto}`,
      `URL: ${window.location.pathname}`,
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < checks.length) {
        setStatus(checks[i]);
        setStep(i + 1);
        i++;
      } else {
        setStatus("ZeroClaw is ready! All systems operational.");
        setStep(100);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#06060a",
      color: "#e2e8f0",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: 48, height: 48,
        border: "2px solid rgba(139,92,246,0.2)",
        borderTopColor: "#8b5cf6",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        marginBottom: 24,
      }} />
      <h1 style={{
        fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px",
        background: "linear-gradient(135deg, #fff 0%, #8b5cf6 100%)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: 16,
      }}>ZeroClaw</h1>
      <div style={{
        background: "rgba(15,23,42,0.6)",
        border: "1px solid rgba(100,116,139,0.2)",
        borderRadius: 12,
        padding: "20px 32px",
        maxWidth: 480,
        width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: step >= 100 ? "#22c55e" : "#8b5cf6",
            boxShadow: step >= 100 ? "0 0 8px #22c55e" : "0 0 8px #8b5cf6",
          }} />
          <span style={{ fontSize: 14, color: "#94a3b8" }}>{status}</span>
        </div>
        <div style={{
          height: 4, background: "rgba(30,41,59,0.5)", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${Math.min(step * 16, 100)}%`,
            background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
            borderRadius: 2, transition: "width 0.3s ease",
          }} />
        </div>
        {step >= 100 && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              XMRT DAO Governance Platform
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <a href="#/dashboard" style={{
                padding: "8px 16px", background: "#8b5cf6", color: "#fff",
                borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 500,
              }}>Dashboard</a>
              <a href="#/governance" style={{
                padding: "8px 16px", background: "rgba(139,92,246,0.15)", color: "#a78bfa",
                borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 500,
                border: "1px solid rgba(139,92,246,0.3)",
              }}>Governance</a>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
