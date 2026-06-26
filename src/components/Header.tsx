import React from "react";
import "../styles/header.css";

interface HeaderProps {
  statusMessage: string;
  loadingPrices?: boolean;
  onRefreshPrices: (clearCache: boolean) => void;
  steamRateLimited?: boolean;
  totalStashValue?: number;
  onStopPrices?: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  statusMessage,
  loadingPrices,
  onRefreshPrices,
  steamRateLimited,
  totalStashValue,
  onStopPrices,
  onOpenSettings,
}) => {
  return (
    <header className="dashboard-header fade-in">
      <div className="brand-section" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ 
              filter: "drop-shadow(0px 0px 8px rgba(255, 128, 0, 0.5))",
              animation: "pulse 2s infinite alternate",
            }}
          >
            <defs>
              <linearGradient id="shield-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff8000" />
                <stop offset="100%" stopColor="#a335ee" />
              </linearGradient>
              <linearGradient id="chart-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ffb830" />
                <stop offset="100%" stopColor="#ff8000" />
              </linearGradient>
            </defs>
            
            <path 
              d="M16 3C19.5 3 24 4.5 26 5.5C26 13.5 23.5 21.5 16 28C8.5 21.5 6 13.5 6 5.5C8 4.5 12.5 3 16 3Z" 
              stroke="url(#shield-grad)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              fill="rgba(17, 19, 26, 0.6)"
            />
            
            <path 
              d="M16 8V21" 
              stroke="#ffffff" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
            <path 
              d="M13 18H19" 
              stroke="#ffffff" 
              strokeWidth="1.5" 
              strokeLinecap="round"
            />
            <path 
              d="M16 21V23" 
              stroke="#ffffff" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
            
            <path 
              d="M9 19L13 15L18 17L23 11" 
              stroke="url(#chart-grad)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            
            <circle cx="23" cy="11" r="2" fill="#ffb830" />
          </svg>
          <h1 className="brand-title">TBH Helper</h1>
        </div>
        {totalStashValue !== undefined && (
          <div style={{
            background: "rgba(255, 128, 0, 0.08)",
            border: "1px solid rgba(255, 128, 0, 0.25)",
            borderRadius: "8px",
            padding: "4px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            lineHeight: "1.2",
            minWidth: "120px"
          }}>
            <span style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
              Inventory Value
            </span>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#ff8000", fontFamily: "var(--font-mono, monospace)" }}>
              ${totalStashValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      <div className="status-container" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>{statusMessage}</span>
        {loadingPrices && (
          <div className="loading-spinner" style={{ width: "12px", height: "12px", borderWidth: "2px", borderTopColor: "#ff8000", margin: 0 }} />
        )}
        {steamRateLimited && (
          <span style={{
            fontSize: "11px",
            fontWeight: "bold",
            color: "#f59e0b",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            padding: "2px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}>
            ⚠ Steam Rate Limited (429)
          </span>
        )}

        {loadingPrices ? (
          <button
            onClick={onStopPrices}
            className="tab-btn"
            style={{
              border: "1px solid rgba(239, 68, 68, 0.4)",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              background: "rgba(239, 68, 68, 0.08)",
              color: "#f87171",
              cursor: "pointer"
            }}
          >
            ⏹ Stop Fetching
          </button>
        ) : (
          <button
            onClick={() => onRefreshPrices(true)}
            className="tab-btn"
            style={{
              border: "1px solid var(--border-color)",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              background: "rgba(255,255,255,0.02)",
              cursor: "pointer"
            }}
          >
            Reset &amp; Refresh Prices
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="tab-btn"
          title="Settings"
          style={{
            border: "1px solid var(--border-color)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "14px",
            background: "rgba(255,255,255,0.02)",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontWeight: 600,
            transition: "all 0.15s"
          }}
        >
          ⚙ Settings
        </button>
      </div>
    </header>
  );
};

