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

function startOfShanghaiDay(now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(now))
      .map((part) => [part.type, part.value]),
  );
  return Date.parse(`${parts.year ?? ""}-${parts.month ?? ""}-${parts.day ?? ""}T00:00:00+08:00`);
}

function formatAmount(qty: string, price: string) {
  const q = Number(qty.replace(/,/g, ""));
  const p = Number(price.replace(/,/g, ""));
  if (!Number.isFinite(q) || !Number.isFinite(p)) return "—";
  const value = Math.round(q * p * 100) / 100;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function daysLeft(expiresAt: number, now = Date.now()) {
  return Math.max(0, Math.ceil((expiresAt - now) / 86_400_000));
}

export { daysLeft, formatAmount, formatClock, startOfShanghaiDay };
