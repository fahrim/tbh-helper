import { useState, useEffect, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { TbhItem, ParsedSave, MarketItem, AnalyticsData, TabType, SortType, PortfolioPoint, WishlistItem, InAppNotification } from "../types";
import { GRADE_MAP, GRADE_COLORS, HERO_CLASS_NAMES, GRADE_RANK } from "../constants";
import { matchSearchQuery } from "../utils";
import { PriceManager } from "../services/price/PriceManager";
import { SteamMarketProvider } from "../services/price/SteamMarketProvider";
import i18n from "../i18n";

function translateStatusMessage(msg: string, lang: "en" | "tr"): string {
  if (lang === "en") return msg;
  if (msg.startsWith("Updating prices (Page")) {
    const parts = msg.replace("Updating prices (Page ", "").replace(")...", "").split("/");
    if (parts.length === 2) {
      return `Fiyatlar güncelleniyor (Sayfa ${parts[0]}/${parts[1]})...`;
    }
    return "Fiyatlar güncelleniyor...";
  }
  if (msg.startsWith("Loaded custom save file: ")) {
    const path = msg.replace("Loaded custom save file: ", "");
    return `Özel kayıt dosyası yüklendi: ${path}`;
  }
  switch (msg) {
    case "Initializing...": return "Başlatılıyor...";
    case "Waiting for Steam login...": return "Steam girişi bekleniyor...";
    case "Successfully connected to Steam! Press 'Refresh Prices' to fetch market data.":
      return "Steam'e başarıyla bağlanıldı! Market fiyatlarını çekmek için 'Fiyatları Yenile'ye basın.";
    case "Steam login window closed.": return "Steam giriş penceresi kapatıldı.";
    case "Failed to launch Steam login window.": return "Steam giriş penceresi açılamadı.";
    case "Disconnected from Steam.": return "Steam bağlantısı kesildi.";
    case "Failed to disconnect from Steam.": return "Steam bağlantısı kesilemedi.";
    case "Price fetching stopped by user.": return "Fiyat çekme işlemi kullanıcı tarafından durduruldu.";
    case "Updating Steam Market prices in background...": return "Steam Pazarı fiyatları arka planda güncelleniyor...";
    case "Market prices updated successfully from Steam.": return "Market fiyatları Steam'den başarıyla güncellendi.";
    case "Failed to fetch Steam Market prices.": return "Steam Pazarı fiyatları çekilemedi.";
    case "Save file updated in real-time.": return "Kayıt dosyası gerçek zamanlı olarak güncellendi.";
    case "Real-time save parsing error.": return "Gerçek zamanlı kayıt dosyası ayrıştırma hatası.";
    case "Decrypting SaveFile_Live.es3...": return "SaveFile_Live.es3 şifresi çözülüyor...";
    case "Save file loaded successfully.": return "Kayıt dosyası başarıyla yüklendi.";
    case "Save file not loaded. Make sure the game is running or you have created a character.":
      return "Kayıt dosyası yüklenemedi. Oyunun açık olduğundan veya karakter oluşturduğunuzdan emin olun.";
    case "Opening file dialog...": return "Dosya seçici açılıyor...";
    case "Save file selection cancelled.": return "Kayıt dosyası seçimi iptal edildi.";
    default: return msg;
  }
}

// @ts-ignore
import tbhDataRaw from "../tbh_data.json";
// @ts-ignore
import tbhDataTrRaw from "../tbh_data_tr.json";
const tbhData: any = tbhDataRaw;
const tbhDataTr: any = tbhDataTrRaw;

export function useSaveData() {
  const [saveData, setSaveData] = useState<any>(null);
  const [prices, setPrices] = useState<Record<string, { price: number; updatedAt: number }>>({});
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortType>("value");
  const [hideNoPriceItems, setHideNoPriceItems] = useState(false);
  const [steamSearchResults, setSteamSearchResults] = useState<MarketItem[]>([]);
  const [searchingSteam, setSearchingSteam] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [steamRateLimited, setSteamRateLimited] = useState(false);
  const [steamLoggedIn, setSteamLoggedIn] = useState(false);
  const [refreshInterval, setRefreshIntervalState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("price_refresh_interval_min");
      const parsed = saved ? parseInt(saved) : 15;
      return isNaN(parsed) || parsed < 10 ? 15 : parsed;
    } catch { return 15; }
  });

  const setRefreshInterval = (minutes: number) => {
    const clamped = Math.max(10, minutes);
    setRefreshIntervalState(clamped);
    try { localStorage.setItem("price_refresh_interval_min", String(clamped)); } catch {}
    // Restart the running interval immediately
    window.dispatchEvent(new Event("tbh:restart-price-interval"));
  };

  const [newItemAlertThreshold, setNewItemAlertThresholdState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("tbh_new_item_alert_threshold");
      const parsed = saved ? parseFloat(saved) : 0;
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } catch { return 0; }
  });

  const setNewItemAlertThreshold = (val: number) => {
    const clamped = Math.max(0, val);
    setNewItemAlertThresholdState(clamped);
    try { localStorage.setItem("tbh_new_item_alert_threshold", String(clamped)); } catch {}
  };

  const [telegramEnabled, setTelegramEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem("tbh_telegram_enabled") === "true";
    } catch { return false; }
  });

  const [telegramBotToken, setTelegramBotTokenState] = useState<string>(() => {
    try {
      return localStorage.getItem("tbh_telegram_bot_token") || "";
    } catch { return ""; }
  });

  const [telegramChatId, setTelegramChatIdState] = useState<string>(() => {
    try {
      return localStorage.getItem("tbh_telegram_chat_id") || "";
    } catch { return ""; }
  });

  const setTelegramEnabled = (val: boolean) => {
    setTelegramEnabledState(val);
    try { localStorage.setItem("tbh_telegram_enabled", String(val)); } catch {}
  };

  const setTelegramBotToken = (val: string) => {
    setTelegramBotTokenState(val);
    try { localStorage.setItem("tbh_telegram_bot_token", val); } catch {}
  };

  const setTelegramChatId = (val: string) => {
    setTelegramChatIdState(val);
    try { localStorage.setItem("tbh_telegram_chat_id", val); } catch {}
  };

  const [closeToTray, setCloseToTrayState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("tbh_close_to_tray");
      return saved === null ? true : saved === "true";
    } catch { return true; }
  });

  const setCloseToTray = (val: boolean) => {
    setCloseToTrayState(val);
    try { localStorage.setItem("tbh_close_to_tray", String(val)); } catch {}
  };

  const [language, setLanguageState] = useState<"en" | "tr">(() => {
    try {
      const saved = localStorage.getItem("tbh_language");
      return (saved === "tr" || saved === "en") ? saved : "en";
    } catch { return "en"; }
  });

  const setLanguage = (lang: "en" | "tr") => {
    setLanguageState(lang);
    try {
      localStorage.setItem("tbh_language", lang);
      i18n.changeLanguage(lang);
    } catch {}
  };

  // Sync language to i18n on mount
  useEffect(() => {
    i18n.changeLanguage(language);
  }, []);

  const sendTelegramMessage = async (message: string) => {
    if (!telegramBotToken || !telegramChatId) return;
    try {
      const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: "HTML"
        })
      });
      if (!res.ok) {
        console.error("Telegram API returned error status:", res.status);
      }
    } catch (err) {
      console.error("Failed to send Telegram message:", err);
    }
  };

  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioPoint[]>(() => {
    try {
      const saved = localStorage.getItem("tbh_portfolio_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const clearPortfolioHistory = () => {
    try {
      localStorage.removeItem("tbh_portfolio_history");
      setPortfolioHistory([]);
    } catch (err) {
      console.error("Failed to clear portfolio history:", err);
    }
  };

  // Parse items from save structure
  const parsedSave = useMemo<ParsedSave | null>(() => {
    if (!saveData) return null;
    
    try {
      let pValueText = saveData.PlayerSaveData.value;
      let playerSave: any;
      if (typeof pValueText === "string") {
        const processed = pValueText
          .replace(/:(\s*)(\d{15,20})/g, ':$1"$2"')
          .replace(/([\[,])\s*(\d{15,20})\s*(?=[,\]])/g, '$1"$2"');
        playerSave = JSON.parse(processed);
      } else {
        playerSave = pValueText;
      }
      
      const itemSaveDatas = playerSave.itemSaveDatas || [];
      const itemLookupMap: Record<string, any> = {};
      for (const item of itemSaveDatas) {
        itemLookupMap[item.UniqueId] = item;
      }
      
      const resolveList = (rawList: any[], _onMarket: boolean, locationLabel: string) => {
        const tempResolved: TbhItem[] = [];
        for (const raw of rawList) {
          const details = itemLookupMap[raw.ItemUniqueId] || raw.Item || (raw.ItemKey != null ? raw : null);
          if (details) {
            const itemKey = String(details.ItemKey);
            const lookupKey = itemKey.endsWith("900") ? itemKey.slice(0, -3) : itemKey;
            
            const props = tbhData.properties[lookupKey] || {};
            const englishName = tbhData.names[lookupKey] || `Item #${lookupKey}`;
            const name = language === "tr" ? (tbhDataTr.names[lookupKey] || englishName) : englishName;
            const gradeCode = props.g || "COM";
            const grade = GRADE_MAP[gradeCode] || "Common";
            const level = props.l || null;
            const gearType = props.t || null;
            const isMaterial = props.tp === "MATERIAL";
            const iconUrl = tbhData.icons[props.s] || null;
            const quantity = raw.Quantity ?? raw.Count ?? raw.Amount ?? details.Quantity ?? details.Count ?? details.Amount ?? 1;
            
            let marketHashName = englishName;
            if (!isMaterial) {
              marketHashName = englishName.includes(`(${grade})`) ? `${englishName} A` : `${englishName} (${grade}) A`;
            }
            
            const priceData = prices[marketHashName];
            const isExpired = priceData && (Date.now() - priceData.updatedAt > 60 * 60 * 1000);
            const price = (priceData && !isExpired) ? priceData.price : null;
            const totalValue = price !== null ? price * quantity : null;
            const updatedAt = priceData ? priceData.updatedAt : null;
            
            tempResolved.push({
              uniqueId: String(raw.ItemUniqueId),
              itemKey,
              lookupKey,
              name,
              grade,
              gradeColor: GRADE_COLORS[grade] || GRADE_COLORS.Unknown,
              level,
              gearType,
              isMaterial,
              iconUrl,
              quantity,
              marketHashName,
              price,
              totalValue,
              updatedAt,
              isChaotic: !!details.IsChaotic,
              isBlocked: !!details.IsBlocked,
              slot: raw.Index ?? 0,
              location: locationLabel,
              enchantCount: details.EnchantCount,
              enchantData: details.EnchantData,
              engravingCount: details.EngravingAppliedTotalCount,
              inscriptionCount: details.InscriptionAppliedTotalCount,
              decorationCount: details.DecorationAppliedTotalCount
            });
          }
        }

        // Group / Stack identical items in the list view
        const grouped: TbhItem[] = [];
        const groupMap = new Map<string, TbhItem>();

        for (const item of tempResolved) {
          const enchantsSig = item.enchantData
            ? item.enchantData.map((e: any) => `${e.StatType}:${e.Value}:${e.Tier}`).join(",")
            : "";
          const key = `${item.lookupKey}_${item.grade}_${item.level}_${item.isChaotic}_${enchantsSig}_${item.location}`;
          
          const existing = groupMap.get(key);
          if (existing) {
            existing.quantity += item.quantity;
            if (existing.price !== null) {
              existing.totalValue = existing.price * existing.quantity;
            }
          } else {
            const clone = { ...item };
            groupMap.set(key, clone);
            grouped.push(clone);
          }
        }

        return grouped;
      };
      
      const inventory = resolveList(playerSave.inventorySaveDatas || [], false, "Inventory");
      const stash = resolveList(playerSave.stashSaveDatas || [], false, "Stash");
      const tradingStash = resolveList(playerSave.tradingStashSaveDatas || [], true, "Market");
      
      const equipped: TbhItem[] = [];
      const equippedByHero: Record<number, TbhItem[]> = {};

      if (playerSave.heroSaveDatas) {
        for (const hero of playerSave.heroSaveDatas) {
          if (!hero.IsUnLock) continue;
          const heroKey = hero.heroKey;
          const heroName = HERO_CLASS_NAMES[heroKey] || `Hero #${heroKey}`;
          const heroLevel = hero.HeroLevel || 1;
          const itemIds = hero.equippedItemIds || [];
          
          const heroEquipped: TbhItem[] = [];
          for (let slotIdx = 0; slotIdx < itemIds.length; slotIdx++) {
            const uniqueId = String(itemIds[slotIdx]);
            if (uniqueId === "0" || !uniqueId) continue;
            
            const details = itemLookupMap[uniqueId];
            if (details) {
              const itemKey = String(details.ItemKey);
              const lookupKey = itemKey.endsWith("900") ? itemKey.slice(0, -3) : itemKey;
              
              const props = tbhData.properties[lookupKey] || {};
              const englishName = tbhData.names[lookupKey] || `Item #${lookupKey}`;
              const name = language === "tr" ? (tbhDataTr.names[lookupKey] || englishName) : englishName;
              const gradeCode = props.g || "COM";
              const grade = GRADE_MAP[gradeCode] || "Common";
              const level = props.l || null;
              const gearType = props.t || null;
              const isMaterial = props.tp === "MATERIAL";
              const iconUrl = tbhData.icons[props.s] || null;
              const quantity = details.Quantity ?? details.Count ?? details.Amount ?? 1;
              
              let marketHashName = englishName;
              if (!isMaterial) {
                marketHashName = englishName.includes(`(${grade})`) ? `${englishName} A` : `${englishName} (${grade}) A`;
              }
              
              const priceData = prices[marketHashName];
              const isExpired = priceData && (Date.now() - priceData.updatedAt > 60 * 60 * 1000);
              const price = (priceData && !isExpired) ? priceData.price : null;
              const totalValue = price !== null ? price * quantity : null;
              const updatedAt = priceData ? priceData.updatedAt : null;
              
              const itemObj: TbhItem = {
                uniqueId,
                itemKey,
                lookupKey,
                name,
                grade,
                gradeColor: GRADE_COLORS[grade] || GRADE_COLORS.Unknown,
                level,
                gearType,
                isMaterial,
                iconUrl,
                quantity,
                marketHashName,
                price,
                totalValue,
                updatedAt,
                isChaotic: !!details.IsChaotic,
                isBlocked: !!details.IsBlocked,
                slot: slotIdx,
                location: `${heroName} (Lv ${heroLevel})`,
                enchantCount: details.EnchantCount,
                enchantData: details.EnchantData,
                engravingCount: details.EngravingAppliedTotalCount,
                inscriptionCount: details.InscriptionAppliedTotalCount,
                decorationCount: details.DecorationAppliedTotalCount
              };
              
              heroEquipped.push(itemObj);
              equipped.push(itemObj);
            }
          }
          equippedByHero[heroKey] = heroEquipped;
        }
      }
      
      const rawCombined = [...inventory, ...stash, ...tradingStash, ...equipped];
      
      // Merge identical items across locations (e.g. Wood in Inventory + Stash → one card)
      const crossGroupMap = new Map<string, TbhItem>();
      const crossGroupOrder: TbhItem[] = [];
      for (const item of rawCombined) {
        const enchantsSig = item.enchantData
          ? item.enchantData.map((e: any) => `${e.StatType}:${e.Value}:${e.Tier}`).join(",")
          : "";
        // Key WITHOUT location so items from different locations can be merged
        const key = `${item.lookupKey}_${item.grade}_${item.level}_${item.isChaotic}_${enchantsSig}`;
        const existing = crossGroupMap.get(key);
        if (existing) {
          existing.quantity += item.quantity;
          if (existing.price !== null) {
            existing.totalValue = existing.price * existing.quantity;
          }
          // Show "Multiple" when the same item spans more than one location
          if (existing.location !== item.location) {
            existing.location = "Multiple";
          }
        } else {
          const clone = { ...item };
          crossGroupMap.set(key, clone);
          crossGroupOrder.push(clone);
        }
      }
      const combined = crossGroupOrder;

      const totalStashValue = combined.reduce((acc, item) => acc + (item.totalValue || 0), 0);
      const totalItems = combined.reduce((acc, item) => acc + item.quantity, 0);
      
      return {
        inventory,
        stash,
        tradingStash,
        equipped,
        equippedByHero,
        combined,
        totalStashValue,
        totalItems,
        level: playerSave.commonSaveData?.cubeLevel || 1,
        heroSaveDatas: playerSave.heroSaveDatas || []
      };
    } catch (e) {
      console.error("Save file parsing failed:", e);
      return null;
    }

  }, [saveData, prices, language]);

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const saved = localStorage.getItem("tbh_wishlist");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);

  // Request desktop notification permission on mount
  useEffect(() => {
    const initNotifications = async () => {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === "granted";
        }
      } catch (err) {
        console.error("Failed to check/request notification permission:", err);
      }
    };
    initNotifications();
  }, []);

  // Sync closeToTray setting to Rust backend on load/change
  useEffect(() => {
    const syncCloseToTray = async () => {
      try {
        await invoke("set_close_to_tray", { enabled: closeToTray });
      } catch (err) {
        console.error("Failed to sync closeToTray to backend:", err);
      }
    };
    syncCloseToTray();
  }, [closeToTray]);

  const addToWishlist = (item: WishlistItem) => {
    setWishlist((prev) => {
      const idx = prev.findIndex((w) => w.itemKey === item.itemKey);
      let updated: WishlistItem[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = item;
      } else {
        updated = [...prev, item];
      }
      try {
        localStorage.setItem("tbh_wishlist", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save wishlist:", err);
      }
      return updated;
    });
  };

  const removeFromWishlist = (itemKey: string) => {
    setWishlist((prev) => {
      const updated = prev.filter((w) => w.itemKey !== itemKey);
      try {
        localStorage.setItem("tbh_wishlist", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save wishlist:", err);
      }
      return updated;
    });
  };

  const dismissNotification = (id: string) => {
    setInAppNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Check wishlist prices and trigger alerts
  useEffect(() => {
    if (loadingPrices || loading || wishlist.length === 0) return;

    let wishlistChanged = false;
    const updatedWishlist = wishlist.map((item) => {
      const priceData = prices[item.marketHashName];
      if (!priceData) return item;

      const currentPrice = priceData.price;
      if (currentPrice === null) return item;

      let shouldAlert = false;
      if (item.alertType === "below" && currentPrice <= item.targetPrice) {
        shouldAlert = true;
      } else if (item.alertType === "above" && currentPrice >= item.targetPrice) {
        shouldAlert = true;
      }

      if (shouldAlert && item.lastNotifiedPrice !== currentPrice) {
        const englishName = tbhData.names[item.itemKey] || item.name;
        const currentName = language === "tr" ? (tbhDataTr.names[item.itemKey] || englishName) : englishName;

        // 1. Native Windows toast notification via Tauri Plugin
        isPermissionGranted().then((granted) => {
          if (granted) {
            sendNotification({
              title: language === "tr" ? `TBH Fiyat Uyarısı: ${currentName}` : `TBH Price Alert: ${currentName}`,
              body: language === "tr"
                ? `${currentName} şu anda $${currentPrice.toFixed(2)} (hedef fiyatın ${item.alertType === "below" ? "altında" : "üstünde"} $${item.targetPrice.toFixed(2)})!`
                : `${currentName} is now $${currentPrice.toFixed(2)} (${item.alertType === "below" ? "below" : "above"} $${item.targetPrice.toFixed(2)})!`
            });
          }
        }).catch((err) => {
          console.error("Failed to trigger desktop notification:", err);
        });

        // 2. In-app persistent notification
        const notifId = `${item.itemKey}_${currentPrice}_${Date.now()}`;
        setInAppNotifications((prev) => [
          ...prev,
          {
            id: notifId,
            title: language === "tr" ? `⭐ Fiyat Uyarısı: ${currentName}` : `⭐ Price Alert: ${currentName}`,
            message: language === "tr"
              ? `Hedef fiyata ulaşıldı! Öğe şu anda $${currentPrice.toFixed(2)} fiyatından listeleniyor (${item.alertType === "below" ? "hedef fiyatın altında" : "hedef fiyatın üstünde"} $${item.targetPrice.toFixed(2)}).`
              : `Target price reached! The item is currently listed at $${currentPrice.toFixed(2)} (${item.alertType === "below" ? "drops below" : "rises above"} $${item.targetPrice.toFixed(2)}).`,
            timestamp: Date.now()
          }
        ]);

        // 3. Telegram notification
        if (telegramEnabled) {
          sendTelegramMessage(
            language === "tr"
              ? `🔔 <b>TBH Fiyat Uyarısı</b>\n\n<b>${currentName}</b> şu anda <b>$${currentPrice.toFixed(2)}</b> (uyarı ayarı: ${item.alertType === "below" ? "≤" : "≥"} $${item.targetPrice.toFixed(2)})!`
              : `🔔 <b>TBH Price Alert</b>\n\n<b>${item.name}</b> is now <b>$${currentPrice.toFixed(2)}</b> (alert set for ${item.alertType === "below" ? "≤" : "≥"} $${item.targetPrice.toFixed(2)})!`
          );
        }

        wishlistChanged = true;
        return {
          ...item,
          lastNotifiedPrice: currentPrice
        };
      }

      // Reset lastNotifiedPrice if the price goes back out of range
      if (!shouldAlert && item.lastNotifiedPrice !== null && item.lastNotifiedPrice !== undefined) {
        wishlistChanged = true;
        return {
          ...item,
          lastNotifiedPrice: null
        };
      }

      return item;
    });

    if (wishlistChanged) {
      setWishlist(updatedWishlist);
      try {
        localStorage.setItem("tbh_wishlist", JSON.stringify(updatedWishlist));
      } catch (err) {
        console.error("Failed to save updated wishlist:", err);
      }
    }
  }, [prices, loadingPrices, loading, wishlist]);

  const prevItemsQuantities = useRef<Record<string, number> | null>(null);

  useEffect(() => {
    if (!parsedSave) {
      prevItemsQuantities.current = null;
      return;
    }

    const getTrackingKey = (item: TbhItem) => {
      const enchantsSig = item.enchantData
        ? item.enchantData.map((e: any) => `${e.StatType}:${e.Value}:${e.Tier}`).join(",")
        : "";
      return `${item.lookupKey}_${item.grade}_${item.level || 0}_${item.isChaotic || false}_${enchantsSig}`;
    };

    const currentQuantities: Record<string, number> = {};
    for (const item of parsedSave.combined) {
      const key = getTrackingKey(item);
      currentQuantities[key] = (currentQuantities[key] || 0) + item.quantity;
    }

    // If initial load, populate map and skip notification
    if (prevItemsQuantities.current === null) {
      prevItemsQuantities.current = currentQuantities;
      return;
    }

    // Check for new/increased high-value items
    if (newItemAlertThreshold > 0) {
      for (const item of parsedSave.combined) {
        const key = getTrackingKey(item);
        const prevQty = prevItemsQuantities.current[key] || 0;
        const currentQty = currentQuantities[key];

        if (currentQty > prevQty) {
          const addedQty = currentQty - prevQty;
          const individualPrice = item.price;

          if (individualPrice !== null && individualPrice >= newItemAlertThreshold) {
            const englishName = tbhData.names[item.lookupKey] || item.name;
            const currentName = language === "tr" ? (tbhDataTr.names[item.lookupKey] || englishName) : englishName;

            // Trigger native OS notification
            isPermissionGranted().then((granted) => {
              if (granted) {
                sendNotification({
                  title: language === "tr" ? `⭐ Değerli Öğe Eklendi!` : `⭐ High-Value Item Added!`,
                  body: language === "tr"
                    ? `${addedQty}x ${currentName} (${item.grade}) tanesi $${individualPrice.toFixed(2)} değerinde olan öğe eklendi!`
                    : `${addedQty}x ${item.name} (${item.grade}) worth $${individualPrice.toFixed(2)} each has been added!`
                });
              }
            }).catch((err) => {
              console.error("Failed to trigger added item native notification:", err);
            });

            // Trigger in-app notification
            const notifId = `added_${item.itemKey}_${Date.now()}_${Math.random()}`;
            setInAppNotifications((prev) => [
              ...prev,
              {
                id: notifId,
                title: language === "tr" ? `⭐ Değerli Öğe Eklendi!` : `⭐ High-Value Item Added!`,
                message: language === "tr"
                  ? `${addedQty}x ${currentName} (${item.grade}) tanesi $${individualPrice.toFixed(2)} değerinde olan öğe envanterinize/zulanıza eklendi.`
                  : `${addedQty}x ${item.name} (${item.grade}) worth $${individualPrice.toFixed(2)} each has been added to your inventory/stash.`,
                timestamp: Date.now()
              }
            ]);

            // 3. Telegram notification
            if (telegramEnabled) {
              sendTelegramMessage(
                language === "tr"
                  ? `⭐ <b>Değerli Öğe Eklendi!</b>\n\n<b>${addedQty}x ${currentName}</b> (${item.grade}) tanesi <b>$${individualPrice.toFixed(2)}</b> değerinde olan öğe envanterinize/zulanıza eklendi.`
                  : `⭐ <b>High-Value Item Added!</b>\n\n<b>${addedQty}x ${item.name}</b> (${item.grade}) worth <b>$${individualPrice.toFixed(2)}</b> each has been added to your inventory/stash.`
              );
            }
          }
        }
      }
    }

    // Update quantities map cache
    prevItemsQuantities.current = currentQuantities;
  }, [parsedSave, newItemAlertThreshold]);

  useEffect(() => {
    invoke<boolean>("is_steam_logged_in")
      .then((loggedIn) => setSteamLoggedIn(loggedIn))
      .catch((err) => console.error("Failed to check Steam login:", err));
  }, []);

  const connectSteam = async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      
      const label = "steam_login_window";
      const loginWin = new WebviewWindow(label, {
        url: "https://steamcommunity.com/login/home/?goto=",
        title: "Steam Login",
        width: 800,
        height: 600,
        center: true,
      });

      setStatusMessage("Waiting for Steam login...");
      
      const interval = setInterval(async () => {
        try {
          const success = await invoke<boolean>("get_steam_cookies", { label });
          if (success) {
            clearInterval(interval);
            setSteamLoggedIn(true);
            setStatusMessage("Successfully connected to Steam! Press 'Refresh Prices' to fetch market data.");
            await loginWin.hide();
          }
        } catch (e) {
          console.error("Error checking cookies:", e);
        }
      }, 3000);

      loginWin.once("tauri://destroyed", () => {
        clearInterval(interval);
        setStatusMessage("Steam login window closed.");
      });
    } catch (err) {
      console.error("Failed to connect Steam:", err);
      setStatusMessage("Failed to launch Steam login window.");
    }
  };

  const disconnectSteam = async () => {
    try {
      await invoke("logout_steam");
      setSteamLoggedIn(false);
      setStatusMessage("Disconnected from Steam.");
      try {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const win = await WebviewWindow.getByLabel("steam_login_window");
        if (win) {
          await win.close();
        }
      } catch (e) {
        console.warn("Failed to find or close steam_login_window:", e);
      }
    } catch (err) {
      console.error("Failed to logout Steam:", err);
      setStatusMessage("Failed to disconnect from Steam.");
    }
  };

  const priceManager = useMemo(() => new PriceManager(), []);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldTakeSnapshotRef = useRef(false);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopFetching = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoadingPrices(false);
    setStatusMessage("Price fetching stopped by user.");
  };

  const refreshPrices = async (clearCache = false) => {
    if (loadingPrices) return;

    if (clearCache) {
      try {
        localStorage.removeItem("steam_prices_cache");
      } catch (e) {
        console.warn("Failed to clear cached prices:", e);
      }
      setPrices({});
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setSteamRateLimited(false);
    setLoadingPrices(true);
    setStatusMessage("Updating Steam Market prices in background...");
    try {
      const now = Date.now();
      const { prices: sPrices } = await priceManager.fetchPrices((incrementalPrices, current, total, has429) => {
        if (signal.aborted) return;
        if (has429) {
          setSteamRateLimited(true);
        }
        const mappedIncremental: Record<string, { price: number; updatedAt: number }> = {};
        for (const key in incrementalPrices) {
          mappedIncremental[key] = { price: incrementalPrices[key], updatedAt: now };
        }
        setPrices((prev) => ({ ...prev, ...mappedIncremental }));
        setStatusMessage(`Updating prices (Page ${current}/${total})...`);
      }, signal);

      if (signal.aborted) {
        setStatusMessage("Price fetching stopped by user.");
        return;
      }

      setStatusMessage("Market prices updated successfully from Steam.");
      
      setPrices((prev) => {
        const merged = { ...prev };
        for (const key in sPrices) {
          merged[key] = { price: sPrices[key], updatedAt: now };
        }
        try {
          localStorage.setItem("steam_prices_cache", JSON.stringify(merged));
        } catch (e) {
          console.warn("Failed to cache prices:", e);
        }
        return merged;
      });
      shouldTakeSnapshotRef.current = true;
    } catch (err) {
      if (signal.aborted) {
        setStatusMessage("Price fetching stopped by user.");
        return;
      }
      console.error("Failed to fetch prices:", err);
      if (String(err).includes("429")) {
        setSteamRateLimited(true);
      }
      setStatusMessage("Failed to fetch Steam Market prices.");
    } finally {
      if (!signal.aborted) {
        setLoadingPrices(false);
      }
    }
  };

  const refreshPricesRef = useRef(refreshPrices);
  useEffect(() => {
    refreshPricesRef.current = refreshPrices;
  });

  const refreshIntervalRef = useRef(refreshInterval);
  useEffect(() => { refreshIntervalRef.current = refreshInterval; }, [refreshInterval]);

  // Setup periodic refresh
  useEffect(() => {
    const tick = () => {
      console.log(`Periodic background refresh triggered (every ${refreshIntervalRef.current} min).`);
      refreshPricesRef.current(false);
    };
    const ms = refreshIntervalRef.current * 60 * 1000;
    let interval = setInterval(tick, ms);

    // Restart interval whenever refreshInterval changes
    const restartInterval = () => {
      clearInterval(interval);
      interval = setInterval(tick, refreshIntervalRef.current * 60 * 1000);
    };
    // Expose restart via a custom event so the setter can trigger it
    window.addEventListener("tbh:restart-price-interval", restartInterval);
    return () => {
      clearInterval(interval);
      window.removeEventListener("tbh:restart-price-interval", restartInterval);
    };
  }, []);

  // Fetch prices from Steam on startup
  useEffect(() => {
    // 1. Try to load cached prices from localStorage first
    try {
      const cached = localStorage.getItem("steam_prices_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        const migrated: Record<string, { price: number; updatedAt: number }> = {};
        for (const key in parsed) {
          const val = parsed[key];
          if (typeof val === "number") {
            migrated[key] = { price: val, updatedAt: Date.now() };
          } else if (val && typeof val === "object" && typeof val.price === "number") {
            migrated[key] = { price: val.price, updatedAt: val.updatedAt || Date.now() };
          }
        }
        setPrices(migrated);
        shouldTakeSnapshotRef.current = true;
        console.log("Loaded prices from localStorage cache.");
      }
    } catch (e) {
      console.warn("Failed to load cached prices:", e);
    }

    // 2. Load local save file immediately without blocking
    loadSaveFile();
  }, [priceManager]);

  // Listen to file watcher updates
  useEffect(() => {
    let unlisten: any = null;

    listen<string>("save_updated", (event) => {
      try {
        const parsed = JSON.parse(event.payload);
        setSaveData(parsed);
        setIsLive(true);
        setStatusMessage("Save file updated in real-time.");
      } catch (err) {
        console.error("Failed to parse watcher payload:", err);
        setStatusMessage("Real-time save parsing error.");
      }
    }).then((fn) => {
      unlisten = fn;
    });

    // Start background watcher on Rust backend
    invoke("start_save_watcher")
      .then(() => {
        console.log("Save watcher thread launched on backend.");
      })
      .catch((err) => {
        console.error("Failed to start save watcher:", err);
      });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // Debounced Steam search (only on market tab)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (activeTab !== "market" || !searchQuery.trim()) {
      setSteamSearchResults([]);
      setSearchingSteam(false);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    let ignore = false;
    searchDebounceRef.current = setTimeout(async () => {
      setSearchingSteam(true);
      const results = await SteamMarketProvider.searchItems(searchQuery.trim());
      if (ignore) return;
      if (results.length > 0) {
        const now = Date.now();
        const priceUpdates: Record<string, { price: number; updatedAt: number }> = {};
        for (const item of results) {
          if (item.price !== null) {
            priceUpdates[item.marketHashName] = { price: item.price, updatedAt: now };
          }
        }
        if (Object.keys(priceUpdates).length > 0) {
          setPrices((prev) => ({ ...prev, ...priceUpdates }));
        }
      }
      setSteamSearchResults(results);
      setSearchingSteam(false);
    }, 400);

    return () => {
      ignore = true;
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, activeTab]);

  const loadSaveFile = () => {
    setStatusMessage("Decrypting SaveFile_Live.es3...");
    invoke<string>("decrypt_save_file")
      .then((res) => {
        const parsed = JSON.parse(res);
        setSaveData(parsed);
        setIsLive(true);
        setStatusMessage("Save file loaded successfully.");
      })
      .catch((err) => {
        console.error("Decrypt save file command failed:", err);
        setStatusMessage("Save file not loaded. Make sure the game is running or you have created a character.");
        setIsLive(false);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const selectManualSaveFile = () => {
    setStatusMessage("Opening file dialog...");
    invoke<string>("select_custom_save_file")
      .then((path) => {
        setStatusMessage(`Loaded custom save file: ${path}`);
        loadSaveFile();
      })
      .catch((err) => {
        console.error("Select custom save file failed:", err);
        setStatusMessage(err || "Save file selection cancelled.");
      });
  };


  useEffect(() => {
    if (loading || loadingPrices || !parsedSave || parsedSave.totalStashValue <= 0) return;
    if (!shouldTakeSnapshotRef.current) return;
    shouldTakeSnapshotRef.current = false;

    try {
      const saved = localStorage.getItem("tbh_portfolio_history");
      let historyList: PortfolioPoint[] = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(historyList)) historyList = [];

      const nowStr = new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });

      const lastPoint = historyList[historyList.length - 1];
      const todayVal = parsedSave.totalStashValue;

      let changed = false;
      if (lastPoint && lastPoint.date === nowStr) {
        if (Math.abs(lastPoint.value - todayVal) > 0.01) {
          lastPoint.value = todayVal;
          lastPoint.timestamp = Date.now();
          changed = true;
        }
      } else {
        historyList.push({
          date: nowStr,
          timestamp: Date.now(),
          value: todayVal
        });
        if (historyList.length > 1000) {
          historyList.shift();
        }
        changed = true;
      }

      if (changed) {
        localStorage.setItem("tbh_portfolio_history", JSON.stringify(historyList));
        setPortfolioHistory([...historyList]);
      }
    } catch (err) {
      console.error("Failed to update portfolio history:", err);
    }
  }, [parsedSave?.totalStashValue, loading, loadingPrices]);

  // Tab Item Filter & Sort
  const currentTabItems = useMemo(() => {
    if (!parsedSave) return [];
    
    let list: TbhItem[] = [];
    if (activeTab === "all") {
      list = parsedSave.combined;
    } else if (activeTab === "stash") {
      list = parsedSave.stash;
    } else if (activeTab === "inventory") {
      list = parsedSave.inventory;
    } else if (activeTab === "equipped") {
      list = parsedSave.equipped;
    } else {
      return [];
    }
    
    if (searchQuery.trim()) {
      list = list.filter((item) => matchSearchQuery(item, searchQuery));
    }
    
    if (gradeFilter !== "all") {
      list = list.filter((item) => item.grade.toLowerCase() === gradeFilter.toLowerCase());
    }
    
    list.sort((a, b) => {
      if (sortBy === "value") {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        if (priceB !== priceA) {
          return priceB - priceA;
        }
        return (b.totalValue || 0) - (a.totalValue || 0);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "grade") {
        const rankA = GRADE_RANK[a.grade] || 0;
        const rankB = GRADE_RANK[b.grade] || 0;
        if (rankB !== rankA) {
          return rankB - rankA;
        }
        return (b.totalValue || 0) - (a.totalValue || 0);
      }
      return 0;
    });
    
    return list;
  }, [parsedSave, activeTab, searchQuery, gradeFilter, sortBy]);

  // Market Explorer items
  const marketExplorerItems = useMemo<MarketItem[]>(() => {
    const list: MarketItem[] = [];
    const seen = new Set<string>();
    
    const properties = tbhData.properties;
    
    for (const key in properties) {
      const prop = properties[key];
      const isMaterial = prop.tp === "MATERIAL";
      
      const gradeCode = prop.g || "COM";
      const grade = GRADE_MAP[gradeCode] || "Common";
      
      const englishName = tbhData.names[key] || "Unknown";
      const name = language === "tr" ? (tbhDataTr.names[key] || englishName) : englishName;
      
      let marketHashName = englishName;
      if (!isMaterial) {
        marketHashName = englishName.includes(`(${grade})`) ? `${englishName} A` : `${englishName} (${grade}) A`;
      }
      
      if (seen.has(marketHashName)) {
        continue;
      }
      seen.add(marketHashName);
      
      const priceData = prices[marketHashName];
      const isExpired = priceData && (Date.now() - priceData.updatedAt > 60 * 60 * 1000);
      const price = (priceData && !isExpired) ? priceData.price : null;
      const updatedAt = priceData ? priceData.updatedAt : null;
      const spriteKey = prop.s || "";
      const iconUrl = tbhData.icons[spriteKey] || null;
      
      list.push({
        name,
        grade,
        gradeColor: GRADE_COLORS[grade] || GRADE_COLORS.Unknown,
        isMaterial,
        iconUrl,
        marketHashName,
        price,
        itemKey: key,
        lookupKey: key,
        gearType: prop.t || null,
        level: prop.l || null,
        updatedAt,
      });
    }
    
    let filtered = list;
    if (hideNoPriceItems) {
      filtered = filtered.filter((item) => item.price !== null);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter((item) => matchSearchQuery(item, searchQuery));
    }
    
    if (gradeFilter !== "all") {
      filtered = filtered.filter((item) => item.grade.toLowerCase() === gradeFilter.toLowerCase());
    }
    
    if (steamSearchResults.length > 0) {
      const existingHashes = new Set(filtered.map((i) => i.marketHashName));
      for (const steamItem of steamSearchResults) {
        if (!existingHashes.has(steamItem.marketHashName)) {
          filtered.push(steamItem);
        }
      }
    }

    filtered.sort((a, b) => {
      if (sortBy === "value") {
        return (b.price || 0) - (a.price || 0);
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "grade") {
        const rankA = GRADE_RANK[a.grade] || 0;
        const rankB = GRADE_RANK[b.grade] || 0;
        if (rankB !== rankA) {
          return rankB - rankA;
        }
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });
    
    return filtered;
  }, [prices, searchQuery, gradeFilter, sortBy, hideNoPriceItems, language, steamSearchResults]);

  // Analytics Computations
  const analyticsData = useMemo<AnalyticsData | null>(() => {
    if (!parsedSave) return null;
    
    const combined = parsedSave.combined;
    
    const rarityDistribution: Record<string, { count: number; value: number }> = {};
    for (const grade of Object.values(GRADE_MAP)) {
      rarityDistribution[grade] = { count: 0, value: 0 };
    }
    rarityDistribution["Common"] = { count: 0, value: 0 };
    
    let materialCount = 0;
    let gearCount = 0;
    
    for (const item of combined) {
      if (item.isMaterial) {
        materialCount += item.quantity;
      } else {
        gearCount += item.quantity;
      }
      
      if (!rarityDistribution[item.grade]) {
        rarityDistribution[item.grade] = { count: 0, value: 0 };
      }
      rarityDistribution[item.grade].count += item.quantity;
      rarityDistribution[item.grade].value += item.totalValue || 0;
    }
    
    const sortedHoldings = [...combined]
      .filter((item) => (item.totalValue || 0) > 0)
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
      
    const groupedHoldingsMap: Record<string, TbhItem> = {};
    for (const item of sortedHoldings) {
      const key = `${item.lookupKey}_${item.grade}`;
      if (groupedHoldingsMap[key]) {
        groupedHoldingsMap[key].quantity += item.quantity;
        groupedHoldingsMap[key].totalValue = (groupedHoldingsMap[key].totalValue || 0) + (item.totalValue || 0);
      } else {
        groupedHoldingsMap[key] = { ...item };
      }
    }
    
    const topHoldings = Object.values(groupedHoldingsMap)
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 5);
      
    return {
      rarityDistribution,
      materialCount,
      gearCount,
      topHoldings
    };
  }, [parsedSave]);

  const localizedWishlist = useMemo<WishlistItem[]>(() => {
    return wishlist.map(item => {
      const englishName = tbhData.names[item.itemKey] || item.name;
      const name = language === "tr" ? (tbhDataTr.names[item.itemKey] || englishName) : englishName;
      return {
        ...item,
        name
      };
    });
  }, [wishlist, language]);

  return {
    // State
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    gradeFilter,
    setGradeFilter,
    sortBy,
    setSortBy,
    hideNoPriceItems,
    setHideNoPriceItems,
    statusMessage: translateStatusMessage(statusMessage, language),
    isLive,
    loading,
    loadingPrices,
    steamRateLimited,
    steamLoggedIn,
    newItemAlertThreshold,
    telegramEnabled,
    telegramBotToken,
    telegramChatId,
    closeToTray,
    language,
    
    // Data
    parsedSave,
    currentTabItems,
    marketExplorerItems,
    analyticsData,
    portfolioHistory,
    wishlist: localizedWishlist,
    inAppNotifications,
    prices,
    searchingSteam,
    
    // Actions
    loadSaveFile,
    selectManualSaveFile,
    refreshPrices,
    refreshInterval,
    setRefreshInterval,
    connectSteam,
    disconnectSteam,
    stopFetching,
    clearPortfolioHistory,
    addToWishlist,
    removeFromWishlist,
    dismissNotification,
    setNewItemAlertThreshold,
    setTelegramEnabled,
    setTelegramBotToken,
    setTelegramChatId,
    sendTelegramMessage,
    setCloseToTray,
    setLanguage,
  };
}
