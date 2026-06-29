import { fetchUrlWithRetry, centsToDollars } from "../utils";

export interface PricePoint {
  date: string;
  fullDate?: string;
  price: number;
  volume: number;
  timestamp: number;
}

export interface ActiveListing {
  price: number;
  count: number;
}

export interface MarketDetail {
  history: PricePoint[];
  listings: ActiveListing[];
}

const MARKET_LISTING_URL = "https://steamcommunity.com/market/listings/3678970";

function parseHistoryFromSSR(html: string): PricePoint[] {
  const pricesMatch = html.match(/prices\\*":\s*(\[[\s\S]*?\])/);
  if (pricesMatch) {
    try {
      const cleanJson = pricesMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\/g, "");
      const pricesList = JSON.parse(cleanJson);
      if (Array.isArray(pricesList) && pricesList.length > 0) {
        return pricesList.map((p: any) => {
          const d = new Date(p.time * 1000);
          return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            fullDate: d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
            price: parseFloat(p.price_median) || 0,
            volume: parseInt(p.purchases) || 0,
            timestamp: p.time * 1000,
          };
        });
      }
    } catch (e) {
      console.warn("Failed to parse SSR prices JSON:", e);
    }
  }

  const historyMatch = html.match(/line1\s*=\s*(\[[\s\S]*?\]);/);
  if (historyMatch) {
    try {
      const rawPoints = JSON.parse(historyMatch[1]);
      return rawPoints.map((p: any) => {
        const dateRaw = String(p[0]);
        const d = new Date(dateRaw);
        const timestamp = d.getTime();
        const isValid = !isNaN(timestamp);
        return {
          date: isValid
            ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : dateRaw,
          fullDate: isValid
            ? d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
            : dateRaw,
          price: parseFloat(p[1]) || 0,
          volume: parseInt(p[2]) || 0,
          timestamp: isValid ? timestamp : 0,
        };
      });
    } catch (e) {
      console.warn("Failed to parse legacy history JSON:", e);
    }
  }

  return [];
}

function parseListingsFromSSR(html: string): ActiveListing[] {
  const match = html.match(/rgCompactSellOrders\\*":\s*(\[[\s\S]*?\])/);
  if (!match) return [];

  try {
    const cleanJson = match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\/g, "");
    const list = JSON.parse(cleanJson);
    if (!Array.isArray(list)) return [];

    const listings: ActiveListing[] = [];
    for (let i = 0; i < list.length; i += 2) {
      listings.push({
        price: centsToDollars(list[i]),
        count: list[i + 1],
      });
    }
    return listings;
  } catch (e) {
    console.warn("Failed to parse sell orders JSON:", e);
    return [];
  }
}

export async function fetchMarketDetail(marketHashName: string): Promise<MarketDetail> {
  const encodedHash = encodeURIComponent(marketHashName);
  const html = await fetchUrlWithRetry(`${MARKET_LISTING_URL}/${encodedHash}`);

  return {
    history: parseHistoryFromSSR(html),
    listings: parseListingsFromSSR(html),
  };
}
