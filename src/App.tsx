import { useState } from "react";
import { SettingsModal } from "./components/SettingsModal";
import { useSaveData } from "./hooks/useSaveData";
import { useUpdateChecker } from "./hooks/useUpdateChecker";
import { GameTooltip, useTooltip } from "./components/GameTooltip";
import { Header } from "./components/Header";
import { TabNavigation } from "./components/TabNavigation";
import { ItemsGrid } from "./components/ItemsGrid";
import { MarketExplorer } from "./components/MarketExplorer";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { EquippedPanel } from "./components/EquippedPanel";
import { LoadingState, NoSaveState } from "./components/EmptyState";
import { ItemDetailModal } from "./components/ItemDetailModal";
import { WishlistPanel } from "./components/WishlistPanel";
import { NotificationStack } from "./components/NotificationStack";
import { UpdateBanner } from "./components/UpdateBanner";
import { TbhItem } from "./types";
import "./App.css";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const pricePage = params.get("price_page");
  const priceData = params.get("price_data");

  if (priceData && pricePage !== null) {
    const pageNum = parseInt(pricePage);
    const emitEvent = async () => {
      try {
        const { emit } = await import("@tauri-apps/api/event");
        await emit("steam_price_data", { page: pageNum, data: priceData });
      } catch (err) {
        console.error("Failed to emit steam_price_data:", err);
      }
    };
    emitEvent();

    return (
      <div style={{
        padding: "40px",
        background: "#121212",
        color: "#ff8000",
        fontFamily: "sans-serif",
        textAlign: "center",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px"
      }}>
        <div className="loading-spinner" style={{ width: "32px", height: "32px", borderWidth: "3px", borderTopColor: "#ff8000", margin: 0 }} />
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>Steam Market Sync</h3>
        <p style={{ margin: 0, color: "#888", fontSize: "14px" }}>
          Transferring page {pageNum / 10 + 1} data...
        </p>
      </div>
    );
  }

  const [selectedDetailItem, setSelectedDetailItem] = useState<TbhItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { updateAvailable } = useUpdateChecker();
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    gradeFilter,
    setGradeFilter,
    typeFilter,
    setTypeFilter,
    onlyUniqueFilter,
    setOnlyUniqueFilter,
    sortBy,
    setSortBy,
    hideNoPriceItems,
    setHideNoPriceItems,
    statusMessage,
    isLive,
    loading,
    parsedSave,
    currentTabItems,
    marketExplorerItems,
    analyticsData,
    portfolioHistory,
    loadSaveFile,
    selectManualSaveFile,
    loadingPrices,
    refreshPrices,
    refreshInterval,
    setRefreshInterval,
    steamRateLimited,
    steamLoggedIn,
    connectSteam,
    disconnectSteam,
    stopFetching,
    clearPortfolioHistory,
    wishlist,
    inAppNotifications,
    prices,
    searchingSteam,
    addToWishlist,
    removeFromWishlist,
    dismissNotification,
    newItemAlertThreshold,
    setNewItemAlertThreshold,
    telegramEnabled,
    telegramBotToken,
    telegramChatId,
    setTelegramEnabled,
    setTelegramBotToken,
    setTelegramChatId,
    sendTelegramMessage,
    closeToTray,
    setCloseToTray,
    language,
    setLanguage,
  } = useSaveData();

  const {
    hoveredItem,
    tooltipPos,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
  } = useTooltip();

  const renderMainContent = () => {
    if (loading) {
      return <LoadingState />;
    }

    if (!parsedSave && activeTab !== "market" && activeTab !== "wishlist") {
      return <NoSaveState onRetry={loadSaveFile} />;
    }

    if (activeTab === "market") {
      return (
        <MarketExplorer
          items={marketExplorerItems}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={(item) => setSelectedDetailItem(item as any)}
          searchingSteam={searchingSteam}
        />
      );
    }

    if (activeTab === "wishlist") {
      return (
        <WishlistPanel
          wishlist={wishlist}
          prices={prices}
          onRemove={removeFromWishlist}
          onClickItem={setSelectedDetailItem}
        />
      );
    }

    if (activeTab === "analytics" && analyticsData && parsedSave) {
      return (
        <AnalyticsPanel
          analyticsData={analyticsData}
          parsedSave={parsedSave}
          portfolioHistory={portfolioHistory}
          onClearPortfolio={clearPortfolioHistory}
        />
      );
    }

    if (activeTab === "equipped" && parsedSave) {
      return (
        <EquippedPanel
          parsedSave={parsedSave}
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      );
    }

    return (
      <ItemsGrid
        items={currentTabItems}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={setSelectedDetailItem}
      />
    );
  };

  return (
    <div className="dashboard-container">
      <Header
        statusMessage={statusMessage}
        loadingPrices={loadingPrices}
        onRefreshPrices={refreshPrices}
        onStopPrices={stopFetching}
        steamRateLimited={steamRateLimited}
        totalStashValue={parsedSave?.totalStashValue}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        gradeFilter={gradeFilter}
        setGradeFilter={setGradeFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onlyUniqueFilter={onlyUniqueFilter}
        setOnlyUniqueFilter={setOnlyUniqueFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        hideNoPriceItems={hideNoPriceItems}
        setHideNoPriceItems={setHideNoPriceItems}
        searchingSteam={searchingSteam}
      />

      <main
        style={{
          flexGrow: 1,
          minHeight: 0,
          overflow: (activeTab === "market" || activeTab === "all" || activeTab === "stash" || activeTab === "inventory" || activeTab === "wishlist") ? "hidden" : "visible",
          display: "flex",
          flexDirection: "column",
        }}
        className="fade-in"
      >
        {renderMainContent()}
      </main>

      <GameTooltip
        hoveredItem={hoveredItem}
        tooltipPos={tooltipPos}
        activeTab={activeTab}
      />

      {selectedDetailItem && (
        <ItemDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          wishlist={wishlist}
          onAddToWishlist={addToWishlist}
          onRemoveFromWishlist={removeFromWishlist}
        />
      )}

      <NotificationStack
        notifications={inAppNotifications}
        onDismiss={dismissNotification}
      />

      <UpdateBanner updateAvailable={updateAvailable} />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isLive={isLive}
        steamLoggedIn={steamLoggedIn}
        onConnectSteam={connectSteam}
        onDisconnectSteam={disconnectSteam}
        onSelectFile={selectManualSaveFile}
        onReload={loadSaveFile}
        refreshInterval={refreshInterval}
        onSetRefreshInterval={setRefreshInterval}
        newItemAlertThreshold={newItemAlertThreshold}
        onSetNewItemAlertThreshold={setNewItemAlertThreshold}
        updateAvailable={updateAvailable}
        telegramEnabled={telegramEnabled}
        telegramBotToken={telegramBotToken}
        telegramChatId={telegramChatId}
        onSetTelegramEnabled={setTelegramEnabled}
        onSetTelegramBotToken={setTelegramBotToken}
        onSetTelegramChatId={setTelegramChatId}
        onSendTelegramTest={sendTelegramMessage}
        closeToTray={closeToTray}
        onSetCloseToTray={setCloseToTray}
        language={language}
        onSetLanguage={setLanguage}
      />
    </div>
  );
}
