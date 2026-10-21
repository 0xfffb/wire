function formatClock(ms: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year ?? ""}-${parts.month ?? ""}-${parts.day ?? ""} ${parts.hour ?? ""}:${parts.minute ?? ""}`;
}

function shanghaiDate(ms = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year ?? ""}-${parts.month ?? ""}-${parts.day ?? ""}`;
}

function asDec(value: unknown) {
  if (value == null || value === "") return "0";
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "0";
  const text = n.toFixed(8).replace(/\.?0+$/, "");
  return text || "0";
}

function asNum(value: string) {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function mulDec(left: string, right: string) {
  return asDec(asNum(left) * asNum(right));
}

function formatMoney(value: string) {
  return asNum(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSigned(value: number) {
  const abs = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function formatPct(part: number, total: number) {
  if (total <= 0) return null;
  const pct = (part / total) * 100;
  if (pct > 0) return `+${pct.toFixed(2)}%`;
  if (pct < 0) return `${pct.toFixed(2)}%`;
  return "0.00%";
}

function currentReturn(holdings: { ccy: string; value: string; cost: string }[]) {
  const byCcy = new Map<string, { value: number; cost: number }>();
  for (const row of holdings) {
    const cur = byCcy.get(row.ccy) ?? { value: 0, cost: 0 };
    cur.value += asNum(row.value);
    cur.cost += asNum(row.cost);
    byCcy.set(row.ccy, cur);
  }
  const entries = [...byCcy.entries()];
  const parts = entries
    .map(([ccy, cur]) => {
      const pct = formatPct(cur.value - cur.cost, cur.cost);
      if (!pct) return null;
      return entries.length === 1 ? pct : `${ccy} ${pct}`;
    })
    .filter((row): row is string => Boolean(row));
  return parts.length ? parts.join(" · ") : null;
}

function weightOf(part: string, total: number) {
  if (total <= 0) return "0.00%";
  return `${((asNum(part) / total) * 100).toFixed(2)}%`;
}

function formatYtd(value: unknown) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[%+,]/g, ""));
  if (!Number.isFinite(n)) return null;
  const pct = Math.abs(n) <= 1 && n !== 0 ? n * 100 : n;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export { asDec, asNum, currentReturn, formatClock, formatMoney, formatPct, formatSigned, formatYtd, mulDec, shanghaiDate, weightOf };
