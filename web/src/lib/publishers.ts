export type Market = "us" | "hk";
export type Copy = { zh: string; en: string };

export type Holding = {
  code: string;
  name: Copy;
  side: "long" | "short" | "flat";
  pct: string;
  pl: string;
  qty: string;
  cost: string;
  value: string;
};

export type Activity = {
  time: Copy;
  text: Copy;
  subText?: Copy;
  note?: Copy;
  fill?: boolean;
};

export type Fill = {
  time: string;
  code: string;
  name: Copy;
  currency: "USD" | "HKD";
  side: "buy" | "sell";
  qty: string;
  price: string;
  amount: string;
  note?: Copy;
};

export type Policy = {
  audience: "public" | "subs";
};

export type Publisher = {
  handle: string;
  name: string;
  bio: Copy;
  markets: Market[];
  ytd: string;
  subscribers: number;
  price: number;
  holdings: Holding[];
  activity: Activity[];
  fills: Fill[];
  policy: Policy;
};

const open: Policy = { audience: "public" };

export const publishers: Publisher[] = [
  {
    handle: "north",
    name: "北境",
    bio: { zh: "美股成长，偏科技与消费。", en: "US growth, tech and consumer." },
    markets: ["us"],
    ytd: "+24.8%",
    subscribers: 1280,
    price: 39,
    policy: open,
    holdings: [
      { code: "NVDA", name: { zh: "英伟达", en: "NVIDIA" }, side: "long", pct: "22.0%", pl: "+41.0%", qty: "48", cost: "94.10", value: "28,460" },
      { code: "AAPL", name: { zh: "苹果", en: "Apple" }, side: "long", pct: "18.4%", pl: "+12.4%", qty: "96", cost: "178.20", value: "23,820" },
      { code: "MSFT", name: { zh: "微软", en: "Microsoft" }, side: "long", pct: "14.1%", pl: "+9.2%", qty: "32", cost: "378.00", value: "18,240" },
      { code: "CASH", name: { zh: "现金 USD", en: "Cash USD" }, side: "flat", pct: "9.0%", pl: "—", qty: "—", cost: "—", value: "11,640" },
    ],
    activity: [
      { time: { zh: "昨天", en: "Yesterday" }, text: { zh: "加仓 NVDA", en: "Added NVDA" }, subText: { zh: "加仓 NVDA · +8", en: "Added NVDA · +8" } },
      { time: { zh: "上周", en: "Last week" }, text: { zh: "减仓 AAPL", en: "Trimmed AAPL" }, subText: { zh: "减仓 AAPL · −20", en: "Trimmed AAPL · −20" } },
    ],
    fills: [
      { time: "2026-10-19 22:18", code: "NVDA", name: { zh: "英伟达", en: "NVIDIA" }, currency: "USD", side: "buy", qty: "8", price: "128.20", amount: "1,025.60" },
      { time: "2026-10-13 11:06", code: "AAPL", name: { zh: "苹果", en: "Apple" }, currency: "USD", side: "sell", qty: "20", price: "178.20", amount: "3,564" },
    ],
  },
  {
    handle: "demo",
    name: "阿木",
    bio: { zh: "美股与港股混合账户。", en: "Mixed US and HK account." },
    markets: ["us", "hk"],
    ytd: "+16.2%",
    subscribers: 412,
    price: 29,
    policy: open,
    holdings: [
      { code: "AAPL", name: { zh: "苹果", en: "Apple" }, side: "long", pct: "24.1%", pl: "+12.4%", qty: "120", cost: "178.20", value: "24,186" },
      { code: "00700", name: { zh: "腾讯", en: "Tencent" }, side: "long", pct: "18.6%", pl: "-3.1%", qty: "400", cost: "312.40", value: "18,640" },
      { code: "NVDA", name: { zh: "英伟达", en: "NVIDIA" }, side: "long", pct: "15.2%", pl: "+41.0%", qty: "36", cost: "94.10", value: "15,228" },
      { code: "TSLA", name: { zh: "特斯拉", en: "Tesla" }, side: "short", pct: "5.4%", pl: "+2.1%", qty: "20", cost: "248.00", value: "5,412" },
      { code: "MSFT", name: { zh: "微软", en: "Microsoft" }, side: "long", pct: "9.2%", pl: "+9.2%", qty: "18", cost: "378.00", value: "9,240" },
      { code: "09988", name: { zh: "阿里巴巴", en: "Alibaba" }, side: "long", pct: "7.1%", pl: "+6.4%", qty: "220", cost: "82.40", value: "7,120" },
      { code: "CASH", name: { zh: "现金 USD", en: "Cash USD" }, side: "flat", pct: "8.4%", pl: "—", qty: "—", cost: "—", value: "8,420" },
    ],
    activity: [
      { time: { zh: "周一", en: "Monday" }, text: { zh: "新建 00700", en: "Opened 00700" }, subText: { zh: "新建 00700 · 400 股", en: "Opened 00700 · 400 sh" }, note: { zh: "港股互联网", en: "HK internet" } },
      { time: { zh: "上周五", en: "Fri" }, text: { zh: "加仓 NVDA", en: "Added NVDA" }, subText: { zh: "加仓 NVDA · +8", en: "Added NVDA · +8" } },
    ],
    fills: [
      { time: "2026-10-19 09:41", code: "00700", name: { zh: "腾讯", en: "Tencent" }, currency: "HKD", side: "buy", qty: "400", price: "312.40", amount: "124,960" },
      { time: "2026-10-16 10:32", code: "NVDA", name: { zh: "英伟达", en: "NVIDIA" }, currency: "USD", side: "buy", qty: "8", price: "118.40", amount: "947.20" },
      { time: "2026-09-18 15:04", code: "TSLA", name: { zh: "特斯拉", en: "Tesla" }, currency: "USD", side: "sell", qty: "20", price: "248.00", amount: "4,960" },
      { time: "2026-09-02 11:20", code: "AAPL", name: { zh: "苹果", en: "Apple" }, currency: "USD", side: "buy", qty: "40", price: "178.20", amount: "7,128" },
      { time: "2026-08-21 21:05", code: "MSFT", name: { zh: "微软", en: "Microsoft" }, currency: "USD", side: "buy", qty: "18", price: "378.00", amount: "6,804" },
      { time: "2026-08-04 10:12", code: "09988", name: { zh: "阿里巴巴", en: "Alibaba" }, currency: "HKD", side: "buy", qty: "220", price: "82.40", amount: "18,128" },
    ],
  },
  {
    handle: "harbor",
    name: "港湾",
    bio: { zh: "港股红利，现金比例偏高。", en: "HK dividends, high cash." },
    markets: ["hk"],
    ytd: "-3.4%",
    subscribers: 88,
    price: 19,
    policy: open,
    holdings: [
      { code: "00005", name: { zh: "汇丰", en: "HSBC" }, side: "long", pct: "21.0%", pl: "-1.2%", qty: "800", cost: "68.40", value: "21,840" },
      { code: "00941", name: { zh: "中国移动", en: "China Mobile" }, side: "long", pct: "16.4%", pl: "+4.8%", qty: "600", cost: "68.10", value: "17,060" },
      { code: "CASH", name: { zh: "现金 HKD", en: "Cash HKD" }, side: "flat", pct: "28.0%", pl: "—", qty: "—", cost: "—", value: "29,120" },
    ],
    activity: [
      { time: { zh: "今天", en: "Today" }, text: { zh: "减仓 00005", en: "Trimmed 00005" }, subText: { zh: "减仓 00005 · −200", en: "Trimmed 00005 · −200" } },
    ],
    fills: [
      { time: "2026-10-20 09:18", code: "00005", name: { zh: "汇丰", en: "HSBC" }, currency: "HKD", side: "sell", qty: "200", price: "68.40", amount: "13,680" },
    ],
  },
  {
    handle: "delta",
    name: "Delta",
    bio: { zh: "指数增强，低换手。", en: "Index plus, low turnover." },
    markets: ["us"],
    ytd: "+8.1%",
    subscribers: 2405,
    price: 49,
    policy: open,
    holdings: [
      { code: "VOO", name: { zh: "标普 500", en: "S&P 500" }, side: "long", pct: "62.0%", pl: "+8.4%", qty: "40", cost: "412.00", value: "64,480" },
      { code: "QQQ", name: { zh: "纳指 100", en: "Nasdaq 100" }, side: "long", pct: "18.0%", pl: "+14.1%", qty: "22", cost: "428.00", value: "18,720" },
      { code: "CASH", name: { zh: "现金 USD", en: "Cash USD" }, side: "flat", pct: "12.0%", pl: "—", qty: "—", cost: "—", value: "12,480" },
    ],
    activity: [
      { time: { zh: "上周", en: "Last week" }, text: { zh: "再平衡 QQQ", en: "Rebalanced QQQ" }, subText: { zh: "再平衡 QQQ · +4", en: "Rebalanced QQQ · +4" } },
    ],
    fills: [
      { time: "2026-10-13 14:22", code: "QQQ", name: { zh: "纳指 100", en: "Nasdaq 100" }, currency: "USD", side: "buy", qty: "4", price: "428.00", amount: "1,712" },
    ],
  },
  {
    handle: "east",
    name: "东时",
    bio: { zh: "港股互联网与消费。", en: "HK internet and consumer." },
    markets: ["hk"],
    ytd: "+11.6%",
    subscribers: 640,
    price: 35,
    policy: open,
    holdings: [
      { code: "03690", name: { zh: "美团", en: "Meituan" }, side: "long", pct: "19.2%", pl: "+22.0%", qty: "500", cost: "118.00", value: "19,970" },
      { code: "09988", name: { zh: "阿里巴巴", en: "Alibaba" }, side: "long", pct: "17.8%", pl: "+6.4%", qty: "800", cost: "82.40", value: "18,510" },
      { code: "00700", name: { zh: "腾讯", en: "Tencent" }, side: "long", pct: "16.0%", pl: "-3.1%", qty: "220", cost: "312.40", value: "16,640" },
      { code: "CASH", name: { zh: "现金 HKD", en: "Cash HKD" }, side: "flat", pct: "8.0%", pl: "—", qty: "—", cost: "—", value: "8,320" },
    ],
    activity: [
      { time: { zh: "今天", en: "Today" }, text: { zh: "加仓 03690", en: "Added 03690" }, subText: { zh: "加仓 03690 · +80", en: "Added 03690 · +80" } },
    ],
    fills: [
      { time: "2026-10-20 10:05", code: "03690", name: { zh: "美团", en: "Meituan" }, currency: "HKD", side: "buy", qty: "80", price: "118.00", amount: "9,440" },
    ],
  },
  {
    handle: "plain",
    name: "平原",
    bio: { zh: "美股价值，少交易。", en: "US value, low trading." },
    markets: ["us"],
    ytd: "+4.2%",
    subscribers: 156,
    price: 15,
    policy: { audience: "subs" },
    holdings: [
      { code: "BRK.B", name: { zh: "伯克希尔", en: "Berkshire" }, side: "long", pct: "28.0%", pl: "+6.1%", qty: "46", cost: "402.00", value: "29,120" },
      { code: "JNJ", name: { zh: "强生", en: "J&J" }, side: "long", pct: "12.4%", pl: "-2.0%", qty: "80", cost: "162.00", value: "12,900" },
      { code: "CASH", name: { zh: "现金 USD", en: "Cash USD" }, side: "flat", pct: "22.0%", pl: "—", qty: "—", cost: "—", value: "22,880" },
    ],
    activity: [
      { time: { zh: "本月", en: "This month" }, text: { zh: "无成交", en: "No fills" } },
    ],
    fills: [],
  },
];

export function publisherByHandle(handle: string | undefined) {
  return publishers.find((item) => item.handle === handle) ?? publishers[1];
}

export function avatarHue(handle: string) {
  let n = 0;
  for (const ch of handle) n = (n * 33 + ch.charCodeAt(0)) >>> 0;
  return n % 360;
}

export function formatSubscribers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}
