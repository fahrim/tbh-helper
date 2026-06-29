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
}

export interface OrderBookData {
  amtMaxBuyOrder: number;
  amtMinSellOrder: number;
  eCurrency: number;
  cBuyOrders: number;
  cSellOrders: number;
  rgCompactBuyOrders: number[];
  rgCompactSellOrders: number[];
}

export interface OrderBookSummary {
  highestBuyPrice: number;
  lowestSellPrice: number;
  highestBuyAmount: number;
  lowestSellAmount: number;
  totalBuyOrders: number;
  totalSellOrders: number;
  buyOrders: ActiveListing[];
  sellOrders: ActiveListing[];
}

const MARKET_LISTING_URL = "https://steamcommunity.com/market/listings/3678970";
const ORDERBOOK_URL = "https://steamcommunity.com/market/orderbook";

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

export function parseCompactOrders(compact: number[]): ActiveListing[] {
  const orders: ActiveListing[] = [];
  for (let i = 0; i < compact.length; i += 2) {
    orders.push({
      price: centsToDollars(compact[i]),
      count: compact[i + 1],
    });
  }
  return orders;
}

export function summarizeOrderBook(data: OrderBookData): OrderBookSummary {
  return {
    highestBuyPrice: centsToDollars(data.amtMaxBuyOrder),
    lowestSellPrice: centsToDollars(data.amtMinSellOrder),
    highestBuyAmount: data.rgCompactBuyOrders.length > 1 ? data.rgCompactBuyOrders[1] : 0,
    lowestSellAmount: data.rgCompactSellOrders.length > 1 ? data.rgCompactSellOrders[1] : 0,
    totalBuyOrders: data.cBuyOrders,
    totalSellOrders: data.cSellOrders,
    buyOrders: parseCompactOrders(data.rgCompactBuyOrders),
    sellOrders: parseCompactOrders(data.rgCompactSellOrders),
  };
}

export async function fetchMarketDetail(marketHashName: string): Promise<MarketDetail> {
  const encodedHash = encodeURIComponent(marketHashName);
  const html = await fetchUrlWithRetry(`${MARKET_LISTING_URL}/${encodedHash}`);

  return {
    history: parseHistoryFromSSR(html),
  };
}

export async function fetchOrderBook(marketHashName: string): Promise<OrderBookData> {
  const qp = JSON.stringify([3678970, marketHashName]);
  const url = `${ORDERBOOK_URL}?q=Load&qp=${encodeURIComponent(qp)}`;
  const text = await fetchUrlWithRetry(url, 3, 2000, {
    "x-valve-request-type": "queryAction",
  });
  const parsed = JSON.parse(text);
  if (!parsed.success) {
    throw new Error("Orderbook API returned unsuccessful response");
  }
  return parsed.data as OrderBookData;
}
