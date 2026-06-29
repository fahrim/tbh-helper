import { PriceProvider } from "./PriceProvider";
import { fetchUrlWithRetry } from "../../utils";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PriceFetchConfig } from "./config";

const APP_ID = 3678970;

function buildSearchUrl(start: number): string {
  return `https://steamcommunity.com/market/search/render/?query=&start=${start}&count=${PriceFetchConfig.pageSize}&search_descriptions=0&sort_column=popular&sort_dir=desc&appid=${APP_ID}&norender=1`;
}

function calcTotalPages(totalCount: number): number {
  return Math.ceil(totalCount / PriceFetchConfig.pageSize);
}

function calcCurrentPage(start: number): number {
  return Math.floor(start / PriceFetchConfig.pageSize) + 1;
}

export class SteamMarketProvider implements PriceProvider {
  id = "steam";
  name = "Steam Market (Direct)";

  async fetchPrices(
    onProgress?: (prices: Record<string, number>, current: number, total: number, has429?: boolean) => void,
    signal?: AbortSignal
  ): Promise<Record<string, number>> {
    const priceMap: Record<string, number> = {};
    let totalCount = 0;

    let isSteamLoggedIn = false;
    try {
      isSteamLoggedIn = await invoke<boolean>("is_steam_logged_in");
    } catch (e) {
      console.warn("Failed to check Steam login in SteamMarketProvider:", e);
    }

    if (isSteamLoggedIn) {
      console.log("Steam logged in. Fetching via child window redirection...");
      const payloadRef: { value: { page: number; data: string } | null } = { value: null };
      const unlisten = await listen<{ page: number; data: string }>("steam_price_data", (event) => {
        payloadRef.value = event.payload;
      });

      try {
        const fetchPageViaWindow = async (startVal: number): Promise<any> => {
          const url = buildSearchUrl(startVal);
          
          await invoke("navigate_steam_window", { label: "steam_login_window", url });
          payloadRef.value = null;

          // Poll every 800ms: try to extract + check if data arrived
          // Move on the moment we have data — no fixed wait
          for (let attempt = 0; attempt < PriceFetchConfig.maxPollAttempts; attempt++) {
            if (signal?.aborted) throw new Error("Aborted");

            await new Promise<void>((resolve, reject) => {
              const t = setTimeout(resolve, PriceFetchConfig.pollIntervalMs);
              if (signal) signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("Aborted")); });
            });

            if (signal?.aborted) throw new Error("Aborted");

            if (payloadRef.value) break;

            try {
              await invoke("extract_steam_data", { label: "steam_login_window", start: startVal });
            } catch (e) {
              console.warn("extract_steam_data attempt failed:", e);
            }

            await new Promise<void>((resolve) => setTimeout(resolve, PriceFetchConfig.extractPropagateWaitMs));
            if (payloadRef.value) break;
          }

          const payload = payloadRef.value;
          if (!payload) {
            throw new Error(`Timeout waiting for page start=${startVal}`);
          }

          // @ts-ignore - TypeScript incorrectly narrows payload to never due to listen() closure interaction
          return JSON.parse((payload as { page: number; data: string }).data);
        };

        const data1 = await fetchPageViaWindow(0);
        if (data1 && data1.success) {
          totalCount = data1.total_count || 0;
          const totalPages = calcTotalPages(totalCount);
          if (data1.results) {
            const pagePrices: Record<string, number> = {};
            for (const item of data1.results) {
              const hashName = item.hash_name || item.market_hash_name;
              if (hashName && item.sell_price) {
                const val = item.sell_price / 100;
                priceMap[hashName] = val;
                pagePrices[hashName] = val;
              }
            }
            if (onProgress) {
              onProgress(pagePrices, 1, totalPages);
            }
          }
        }

        const totalPages = calcTotalPages(totalCount);

        if (totalCount > PriceFetchConfig.pageSize) {
          for (let start = PriceFetchConfig.pageSize; start < totalCount; start += PriceFetchConfig.pageSize) {
            if (signal?.aborted) break;

            const data = await fetchPageViaWindow(start);
            if (data && data.success && data.results) {
              const pagePrices: Record<string, number> = {};
              for (const item of data.results) {
                const hashName = item.hash_name || item.market_hash_name;
                if (hashName && item.sell_price) {
                  const val = item.sell_price / 100;
                  priceMap[hashName] = val;
                  pagePrices[hashName] = val;
                }
              }
              if (onProgress) {
                onProgress(pagePrices, calcCurrentPage(start), totalPages);
              }
            }
          }
        }

      } finally {
        unlisten();
      }

      return priceMap;
    }

    // Page 1
    const url1 = buildSearchUrl(0);
    let data1;
    let retryCount1 = 0;
    
    while (retryCount1 < PriceFetchConfig.maxRetries) {
      if (signal?.aborted) return priceMap;
      try {
        const rawData1 = await fetchUrlWithRetry(url1, PriceFetchConfig.maxRetries, PriceFetchConfig.retryBaseDelayMs);
        data1 = JSON.parse(rawData1);
        if (data1 && data1.success) {
          totalCount = data1.total_count || 0;
          const totalPages = calcTotalPages(totalCount);
          if (data1.results) {
            const pagePrices: Record<string, number> = {};
            for (const item of data1.results) {
              const hashName = item.hash_name || item.market_hash_name;
              if (hashName && item.sell_price) {
                const val = item.sell_price / 100;
                priceMap[hashName] = val;
                pagePrices[hashName] = val;
              }
            }
            if (onProgress) {
              onProgress(pagePrices, 1, totalPages);
            }
          }
        }
        break;
      } catch (e) {
        console.error(`Steam Market Page 1 failed (Attempt ${retryCount1 + 1}/${PriceFetchConfig.maxRetries}):`, e);
        const is429 = String(e).includes("429");
        if (is429 && onProgress) {
          onProgress({}, 1, 1, true);
        }
        retryCount1++;
        if (retryCount1 >= PriceFetchConfig.maxRetries) {
          throw e;
        }
        if (is429) {
          console.log(`Steam 429 on Page 1. Waiting ${PriceFetchConfig.steam429BackoffMs / 1000}s before retry...`);
          if (signal?.aborted) return priceMap;
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, PriceFetchConfig.steam429BackoffMs);
            if (signal) {
              signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                resolve();
              });
            }
          });
        } else {
          console.log(`Non-429 error. Retrying immediately...`);
        }
      }
    }

    const totalPages = calcTotalPages(totalCount);
    const remainingPages = totalPages - 1;

    const targetDurationMs = PriceFetchConfig.guestModeSpreadDurationMs;
    let delayMs = remainingPages > 0 ? Math.floor(targetDurationMs / remainingPages) : 1500;

    if (totalCount > PriceFetchConfig.pageSize) {
      let retryCount = 0;
      for (let start = PriceFetchConfig.pageSize; start < totalCount; start += PriceFetchConfig.pageSize) {
        if (signal?.aborted) return priceMap;
        const url = buildSearchUrl(start);
        try {
          if (signal?.aborted) return priceMap;
          try {
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                if (signal?.aborted) {
                  reject(new Error("Aborted"));
                } else {
                  resolve();
                }
              }, delayMs);
              if (signal) {
                signal.addEventListener("abort", () => {
                  clearTimeout(timeout);
                  reject(new Error("Aborted"));
                });
              }
            });
          } catch (e) {
            return priceMap;
          }
          
          if (signal?.aborted) return priceMap;
          const rawData = await fetchUrlWithRetry(url, PriceFetchConfig.maxRetries, PriceFetchConfig.retryBaseDelayMs);
          retryCount = 0;
          
          const data = JSON.parse(rawData);
          if (data && data.success && data.results) {
            const pagePrices: Record<string, number> = {};
            for (const item of data.results) {
              const hashName = item.hash_name || item.market_hash_name;
              if (hashName && item.sell_price) {
                const val = item.sell_price / 100;
                priceMap[hashName] = val;
                pagePrices[hashName] = val;
              }
            }
            if (onProgress) {
              onProgress(pagePrices, calcCurrentPage(start), totalPages);
            }
          }
        } catch (err) {
          console.warn(`Steam Market Page start=${start} failed (non-critical):`, err);
          const is429 = String(err).includes("429");
          if (is429) {
            if (onProgress) {
              onProgress({}, calcCurrentPage(start), totalPages, true);
            }
            delayMs = Math.min(delayMs + PriceFetchConfig.guest429DelayIncrementMs, PriceFetchConfig.guestMaxDelayMs);
            console.log(`DEBUG: Adjusting delayMs to ${delayMs}ms due to 429 rate limit.`);

            if (retryCount < PriceFetchConfig.maxRetries) {
              retryCount++;
              console.log(`Steam 429 rate limit hit. Waiting 60s (Attempt ${retryCount}/${PriceFetchConfig.maxRetries}) before retrying page start=${start}...`);
              if (signal?.aborted) return priceMap;
              try {
                await new Promise<void>((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    if (signal?.aborted) {
                      reject(new Error("Aborted"));
                    } else {
                      resolve();
                    }
                  }, PriceFetchConfig.steam429BackoffMs);
                  if (signal) {
                    signal.addEventListener("abort", () => {
                      clearTimeout(timeout);
                      reject(new Error("Aborted"));
                    });
                  }
                });
              } catch (e) {
                return priceMap;
              }
              start -= PriceFetchConfig.pageSize;
            } else {
              console.warn(`Steam 429 rate limit hit. Maximum retries (${PriceFetchConfig.maxRetries}) reached for page start=${start}. Skipping.`);
              retryCount = 0;
            }
          }
        }
      }
    }

    return priceMap;
  }
}
