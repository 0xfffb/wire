export type Copy = { zh: string; en: string };
export type Market = "us" | "hk";
export type AccountMarket = Market | "futures";

function parseCopy(raw: string): Copy {
  const text = raw.trim();
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Partial<Copy>;
      if (typeof parsed.zh === "string" && parsed.zh) {
        return { zh: parsed.zh, en: typeof parsed.en === "string" && parsed.en ? parsed.en : parsed.zh };
      }
    } catch {
      /* fall through */
    }
  }
  return { zh: raw, en: raw };
}

function parseMarkets(raw: string): Market[] {
  return parseAccountMarkets(raw).filter((item): item is Market => item === "us" || item === "hk");
}

function parseAccountMarkets(raw: string): AccountMarket[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is AccountMarket => item === "us" || item === "hk" || item === "futures");
  } catch {
    return [];
  }
}

function marketFromCurrency(currency: string): Market | "cash" {
  if (currency === "HKD") return "hk";
  if (currency === "USD") return "us";
  return "cash";
}

function isAccountMarket(value: string): value is AccountMarket {
  return value === "us" || value === "hk" || value === "futures";
}

export { isAccountMarket, marketFromCurrency, parseAccountMarkets, parseCopy, parseMarkets };
