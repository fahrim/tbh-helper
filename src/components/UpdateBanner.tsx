import React, { useState } from "react";
import { useUpdateChecker } from "../hooks/useUpdateChecker";

export const UpdateBanner: React.FC = () => {
  const { updateAvailable } = useUpdateChecker();
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!updateAvailable || dismissed) return null;

  const openRelease = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_in_browser", { url: updateAvailable.html_url });
    } catch {
      window.open(updateAvailable.html_url, "_blank");
    }
  };

  const startAutoUpdate = async () => {
    setError(null);
    const exeAsset = updateAvailable.assets?.find(asset => asset.name.endsWith(".exe"));
    if (!exeAsset) {
      openRelease();
      return;
    }

    setDownloading(true);
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("install_update", { url: exeAsset.browser_download_url });
    } catch (err) {
      console.error("Auto update failed:", err);
      setError("Auto update failed. Opening release page...");
      setDownloading(false);
      setTimeout(() => openRelease(), 2000);
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: 9999,
      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(16, 185, 129, 0.06))",
      border: "1px solid rgba(16, 185, 129, 0.35)",
      borderRadius: "12px",
      padding: "14px 18px",
      maxWidth: "320px",
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
      animation: "slideInDown 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Icon */}
        <div style={{
          fontSize: "22px",
          lineHeight: 1,
          flexShrink: 0,
          marginTop: "2px"
        }}>🚀</div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#10b981",
            marginBottom: "2px",
            letterSpacing: "0.3px"
          }}>
            {downloading ? "Installing Update..." : "Update Available"}
          </div>
          <div style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginBottom: "10px",
            lineHeight: 1.4
          }}>
            {downloading ? (
              <span>Downloading and preparing to launch setup...</span>
            ) : error ? (
              <span style={{ color: "#ef4444" }}>{error}</span>
            ) : (
              <span>
                Version{" "}
                <strong style={{ color: "var(--text-primary)" }}>
                  {updateAvailable.name || updateAvailable.tag_name}
                </strong>{" "}
                is available.
              </span>
            )}
          </div>
          {!downloading && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={startAutoUpdate}
                style={{
                  background: "#10b981",
                  border: "none",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.3px",
                }}
              >
                Update Now
              </button>
              <button
                onClick={openRelease}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Release Page
              </button>
            </div>
          )}
        </div>

        {/* Close */}
        {!downloading && (
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
