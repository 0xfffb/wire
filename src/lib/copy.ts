export type Copy = { zh: string; en: string };
export type Market = "us" | "hk";

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
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Market => item === "us" || item === "hk");
  } catch {
    return [];
  }
}

function marketFromCurrency(currency: string): Market | "cash" {
  if (currency === "HKD") return "hk";
  if (currency === "USD") return "us";
  return "cash";
}

export { marketFromCurrency, parseCopy, parseMarkets };
