import React, { useState, useEffect } from "react";
import "../styles/settings-modal.css";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  steamLoggedIn: boolean;
  onConnectSteam?: () => void;
  onDisconnectSteam?: () => void;
  onSelectFile: () => void;
  onReload: () => void;
  refreshInterval: number;
  onSetRefreshInterval: (minutes: number) => void;
  newItemAlertThreshold: number;
  onSetNewItemAlertThreshold: (val: number) => void;
  updateAvailable: any;
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  onSetTelegramEnabled: (val: boolean) => void;
  onSetTelegramBotToken: (val: string) => void;
  onSetTelegramChatId: (val: string) => void;
  onSendTelegramTest: (msg: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isLive,
  steamLoggedIn,
  onConnectSteam,
  onDisconnectSteam,
  onSelectFile,
  onReload,
  refreshInterval,
  onSetRefreshInterval,
  newItemAlertThreshold,
  onSetNewItemAlertThreshold,
  updateAvailable,
  telegramEnabled,
  telegramBotToken,
  telegramChatId,
  onSetTelegramEnabled,
  onSetTelegramBotToken,
  onSetTelegramChatId,
  onSendTelegramTest,
}) => {
  const [appVersion, setAppVersion] = useState<string>("...");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setAppVersion)
      .catch(() => setAppVersion("0.0.3"));
  }, [isOpen]);

  const openRelease = async () => {
    if (!updateAvailable) return;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_in_browser", { url: updateAvailable.html_url });
    } catch {
      window.open(updateAvailable.html_url, "_blank");
    }
  };

  const startAutoUpdate = async () => {
    if (!updateAvailable) return;
    setError(null);
    const exeAsset = updateAvailable.assets?.find((asset: any) => asset.name.endsWith(".exe"));
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

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="settings-header">
          <div className="settings-title-row">
            <span className="settings-icon">&#9881;</span>
            <h2 className="settings-title">Settings</h2>
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">&#10005;</button>
        </div>

        {/* 2-column body */}
        <div className="settings-body settings-grid">

          {/* LEFT COLUMN */}
          <div className="settings-col">

            {/* Steam Market */}
            <section className="settings-section">
              <h3 className="settings-section-title">Steam Market</h3>
              <p className="settings-section-desc">
                Without a Steam login, the <strong style={{ color: "var(--text-main)" }}>Steam Community Market</strong> blocks
                price requests after a short while &mdash; returning a <strong style={{ color: "#f59e0b" }}>429 Too Many Requests</strong> error.
                Logging in significantly raises this limit, allowing all prices to be fetched reliably.
                Your account is only used to make market requests; no personal data is stored or shared.
              </p>
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-name">Connection Status</span>
                  <span className={`settings-badge ${steamLoggedIn ? "badge-success" : "badge-error"}`}>
                    <span className="badge-dot" />
                    {steamLoggedIn ? "STEAM CONNECTED" : "STEAM DISCONNECTED"}
                  </span>
                </div>
                <div className="settings-row-actions">
                  {steamLoggedIn ? (
                    <button className="settings-btn btn-danger" onClick={() => { onDisconnectSteam?.(); onClose(); }}>
                      Disconnect Steam
                    </button>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                      <button className="settings-btn btn-primary" onClick={() => { onConnectSteam?.(); onClose(); }}>
                        &#128268; Connect Steam
                      </button>
                      <span className="settings-connect-warning">
                        &#9888; A login window will open &mdash; do not close this app until login is complete.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="settings-divider" />

            {/* Auto Price Refresh */}
            <section className="settings-section">
              <h3 className="settings-section-title">Auto Price Refresh</h3>
              <p className="settings-section-desc">
                Prices are automatically refreshed in the background at the selected interval.
              </p>
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-name">Refresh Interval</span>
                  <span className="settings-row-hint">Minimum 10 minutes</span>
                </div>
                <div className="settings-row-actions">
                  <select
                    className="settings-interval-select"
                    value={refreshInterval}
                    onChange={(e) => onSetRefreshInterval(Number(e.target.value))}
                  >
                    <option value={10}>Every 10 minutes</option>
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour</option>
                    <option value={120}>Every 2 hours</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="settings-divider" />

            {/* High-Value Item Alerts */}
            <section className="settings-section">
              <h3 className="settings-section-title">High-Value Item Alerts</h3>
              <p className="settings-section-desc">
                Get notified when you obtain a new item whose market value is above the set threshold. Set to 0 to disable.
              </p>
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-name">Min Price Threshold ($)</span>
                  <span className="settings-row-hint">Alert on new items worth at least this much</span>
                </div>
                <div className="settings-row-actions">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="settings-interval-select"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-main)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      width: "120px",
                      textAlign: "right"
                    }}
                    value={newItemAlertThreshold}
                    onChange={(e) => onSetNewItemAlertThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                </div>
              </div>
            </section>

            <div className="settings-divider" />

            {/* Telegram Notifications */}
            <section className="settings-section">
              <h3 className="settings-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📬 Telegram Notifications</span>
              </h3>
              <p className="settings-section-desc">
                Receive instant price alerts and new high-value item notifications directly on your mobile Telegram app (100% free!).
              </p>
              
              <div className="settings-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="settings-row-label">
                  <span className="settings-row-name">Enable Telegram Alerts</span>
                  <span className="settings-row-hint">Forward alerts to your Telegram bot</span>
                </div>
                <div className="settings-row-actions">
                  <input 
                    type="checkbox" 
                    checked={telegramEnabled} 
                    onChange={(e) => onSetTelegramEnabled(e.target.checked)} 
                    style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#10b981" }}
                  />
                </div>
              </div>

              {telegramEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px", background: "rgba(0,0,0,0.15)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-dark)", fontWeight: "bold" }}>BOT TOKEN</span>
                    <input 
                      type="text" 
                      placeholder="e.g. 123456789:ABCdef..." 
                      value={telegramBotToken} 
                      onChange={(e) => onSetTelegramBotToken(e.target.value.trim())} 
                      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-main)", padding: "6px 8px", borderRadius: "6px", fontSize: "12px", width: "100%" }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "10px", color: "var(--text-dark)", fontWeight: "bold" }}>CHAT ID</span>
                    <input 
                      type="text" 
                      placeholder="e.g. 987654321" 
                      value={telegramChatId} 
                      onChange={(e) => onSetTelegramChatId(e.target.value.trim())} 
                      style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", color: "var(--text-main)", padding: "6px 8px", borderRadius: "6px", fontSize: "12px", width: "100%" }}
                    />
                  </div>
                  <button 
                    onClick={() => onSendTelegramTest("⚡ <b>TBH Helper Connection Test</b>\n\nTelegram notifications are now active and configured successfully!")}
                    disabled={!telegramBotToken || !telegramChatId}
                    style={{ 
                      background: (!telegramBotToken || !telegramChatId) ? "rgba(255,255,255,0.02)" : "rgba(16, 185, 129, 0.1)", 
                      border: (!telegramBotToken || !telegramChatId) ? "1px solid var(--border-color)" : "1px solid rgba(16, 185, 129, 0.3)", 
                      color: (!telegramBotToken || !telegramChatId) ? "var(--text-muted)" : "#10b981", 
                      padding: "8px", 
                      borderRadius: "6px", 
                      fontSize: "12px", 
                      fontWeight: "600", 
                      cursor: (!telegramBotToken || !telegramChatId) ? "not-allowed" : "pointer", 
                      transition: "all 0.15s ease", 
                      marginTop: "4px" 
                    }}
                  >
                    Test Connection
                  </button>
                  <span style={{ fontSize: "9px", color: "var(--text-dark)", lineHeight: "1.3" }}>
                    ℹ️ <strong>Setup:</strong> 1. Message <code>@BotFather</code> on Telegram, send <code>/newbot</code> to get a Bot Token. 2. Message <code>@GetIDBot</code> to get your Chat ID. 3. Search for your bot and click <strong>Start</strong>, then click Test Connection above.
                  </span>
                </div>
              )}
            </section>

          </div>

          {/* RIGHT COLUMN */}
          <div className="settings-col">

            {/* Save File */}
            <section className="settings-section">
              <h3 className="settings-section-title">Save File</h3>
              <p className="settings-section-desc">
                Real-time sync watches your game&apos;s save file automatically. You can also
                select a custom save file or manually reload.
              </p>
              <div className="settings-row">
                <div className="settings-row-label">
                  <span className="settings-row-name">Real-Time Sync</span>
                  <span className={`settings-badge ${isLive ? "badge-success" : "badge-error"}`}>
                    <span className="badge-dot" />
                    {isLive ? "ACTIVE" : "DISCONNECTED"}
                  </span>
                </div>
                <div className="settings-row-actions">
                  <button className="settings-btn btn-secondary" onClick={() => { onReload(); onClose(); }}>
                    &#8635; Manual Reload
                  </button>
                </div>
              </div>
              <div className="settings-row" style={{ marginTop: "10px" }}>
                <div className="settings-row-label">
                  <span className="settings-row-name">Custom Save File</span>
                  <span className="settings-row-hint">Override the default save location</span>
                </div>
                <div className="settings-row-actions">
                  <button className="settings-btn btn-secondary" onClick={() => { onSelectFile(); onClose(); }}>
                    &#128194; Select Save File
                  </button>
                </div>
              </div>
            </section>

            <div className="settings-divider" />

            {/* About */}
            <section className="settings-section">
              <h3 className="settings-section-title">About</h3>
              <div className="settings-about-card">
                <div className="settings-about-logo">&#9889;</div>
                <div className="settings-about-info">
                  <span className="settings-about-name">TBH Helper</span>
                  <span className="settings-about-version">v{appVersion}</span>
                  <span className="settings-about-author">by <strong>Selim Arda &#199;evik</strong></span>
                  <span className="settings-about-contact">
                    For support &amp; suggestions:{" "}
                    <a href="mailto:selimardacevik@proton.me" className="settings-about-email">
                      selimardacevik@proton.me
                    </a>
                  </span>
                </div>
              </div>

              {updateAvailable && (
                <div className="settings-update-banner" style={{
                  marginTop: "12px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "bold", color: "#10b981" }}>
                    <span>🚀 New version is available: {updateAvailable.name || updateAvailable.tag_name}</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                    {downloading ? "Downloading and preparing to launch setup..." : error ? error : "An update is ready for installation."}
                  </p>
                  {!downloading && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        onClick={startAutoUpdate}
                        style={{
                          background: "#10b981",
                          border: "none",
                          color: "#fff",
                          borderRadius: "4px",
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer"
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
                          borderRadius: "4px",
                          padding: "4px 10px",
                          fontSize: "11px",
                          cursor: "pointer"
                        }}
                      >
                        Yenilikleri Gör
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="settings-divider" />

            {/* Privacy */}
            <section className="settings-section">
              <h3 className="settings-section-title">Privacy &amp; Network</h3>
              <div className="settings-privacy-card">
                <div className="settings-privacy-row">
                  <span className="privacy-icon">&#127760;</span>
                  <div className="privacy-text">
                    <strong>Steam Community Market</strong>
                    <span>Fetches live item prices. No data is sent &mdash; read-only requests only.</span>
                  </div>
                </div>
                <div className="settings-privacy-row">
                  <span className="privacy-icon">&#128025;</span>
                  <div className="privacy-text">
                    <strong>GitHub</strong>
                    <span>Checks for app updates. Only the latest release version number is read.</span>
                  </div>
                </div>
                <div className="settings-privacy-notice">
                  &#128274; Your <strong>save file</strong> and <strong>Steam cookies</strong> never leave your device. No analytics, no tracking, no third-party servers.
                </div>
              </div>
            </section>

          </div>

        </div>
      </div>
    </div>
  );
};