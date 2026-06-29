import React from "react";
import { useTranslation } from "react-i18next";
import { TabType, SortType } from "../types";
import { GRADE_MAP } from "../constants";
import "../styles/tabs.css";

interface TabNavigationProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  gradeFilter: string;
  setGradeFilter: (g: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  onlyUniqueFilter: boolean;
  setOnlyUniqueFilter: (v: boolean) => void;
  sortBy: SortType;
  setSortBy: (s: SortType) => void;
  hideNoPriceItems: boolean;
  setHideNoPriceItems: (v: boolean) => void;
  searchingSteam?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
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
  searchingSteam,
}) => {
  const { t } = useTranslation();
  return (
    <div className="controls-row fade-in">
      <div className="tabs-list">
        <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          {t("all")}
        </button>
        <button className={`tab-btn ${activeTab === "stash" ? "active" : ""}`} onClick={() => setActiveTab("stash")}>
          {t("stash")}
        </button>
        <button className={`tab-btn ${activeTab === "inventory" ? "active" : ""}`} onClick={() => setActiveTab("inventory")}>
          {t("inventory")}
        </button>
        <button className={`tab-btn ${activeTab === "equipped" ? "active" : ""}`} onClick={() => setActiveTab("equipped")}>
          {t("equippedTab")}
        </button>
        <button className={`tab-btn ${activeTab === "market" ? "active" : ""}`} onClick={() => setActiveTab("market")}>
          {t("marketPrices")}
        </button>
        <button className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>
          {t("analytics")}
        </button>
        <button className={`tab-btn ${activeTab === "wishlist" ? "active" : ""}`} onClick={() => setActiveTab("wishlist")}>
          {t("wishlist")}
        </button>
      </div>

      {activeTab !== "analytics" && (
        <div className="filters-list">
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input 
              type="text" 
              placeholder={t("searchPlaceholder")} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchingSteam && activeTab === "market" && (
              <span style={{
                position: "absolute",
                right: "8px",
                fontSize: "10px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}>
                Steam...
              </span>
            )}
          </div>
          <select 
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="select-input"
          >
            <option value="all">{t("allRarities")}</option>
            {Object.values(GRADE_MAP).map((grade) => (
              <option key={grade} value={grade}>{grade}</option>
            ))}
          </select>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select-input"
          >
            <option value="all">{t("allTypes")}</option>
            <option value="weapon">{t("typeWeapon")}</option>
            <option value="offhand">{t("typeOffhand")}</option>
            <option value="armor">{t("typeArmor")}</option>
            <option value="accessory">{t("typeAccessory")}</option>
            <option value="materials">{t("typeMaterials")}</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="select-input"
          >
            <option value="value">{t("sortByUnitPrice")}</option>
            <option value="name">{t("sortByName")}</option>
            <option value="grade">{t("sortByRarity")}</option>
          </select>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            color: "var(--text-muted)",
            cursor: "pointer",
            userSelect: "none",
            whiteSpace: "nowrap",
            padding: "4px 8px"
          }}>
            <input
              type="checkbox"
              checked={onlyUniqueFilter}
              onChange={(e) => setOnlyUniqueFilter(e.target.checked)}
              style={{
                cursor: "pointer",
                accentColor: "#ff8000"
              }}
            />
            {t("onlyUniqueMods")}
          </label>

          {activeTab === "market" && (
            <button
              className={`tab-btn ${hideNoPriceItems ? "active" : ""}`}
              onClick={() => setHideNoPriceItems(!hideNoPriceItems)}
              title={t("toggleNoPriceTitle")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "6px",
                border: hideNoPriceItems
                  ? "1px solid rgba(255, 128, 0, 0.5)"
                  : "1px solid var(--border-color)",
                background: hideNoPriceItems
                  ? "rgba(255, 128, 0, 0.1)"
                  : "rgba(255,255,255,0.02)",
                color: hideNoPriceItems ? "#ff8000" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {hideNoPriceItems ? `👁 ${t("showAll")}` : `🚫 ${t("hideNoPrice")}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
