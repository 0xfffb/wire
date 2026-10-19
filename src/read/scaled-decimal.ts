const SCALE = 100_000_000n;

export class ScaledDecimal {
  constructor(readonly value: bigint) {}

  static parse(raw: string) {
    const trimmed = raw.trim();
    const negative = trimmed.startsWith("-");
    const body = negative ? trimmed.slice(1) : trimmed;
    const [whole = "0", frac = ""] = body.split(".");
    const padded = (frac.replace(/\D/g, "") + "00000000").slice(0, 8);
    const wholeDigits = whole.replace(/\D/g, "") || "0";
    const scaled = BigInt(wholeDigits) * SCALE + BigInt(padded || "0");
    return new ScaledDecimal(negative ? -scaled : scaled);
  }

  static sum(values: ScaledDecimal[]) {
    return new ScaledDecimal(values.reduce((total, item) => total + item.value, 0n));
  }

  format(digits = 2) {
    const negative = this.value < 0n;
    const value = negative ? -this.value : this.value;
    const factor = 10n ** BigInt(8 - digits);
    const rounded = (value + factor / 2n) / factor;
    const scale = 10n ** BigInt(digits);
    const whole = rounded / scale;
    const frac = (rounded % scale).toString().padStart(digits, "0");
    return `${negative ? "-" : ""}${whole}.${frac}`;
  }

  weightPercent(total: ScaledDecimal) {
    if (total.value === 0n) return "0.00";
    const part = this.value < 0n ? -this.value : this.value;
    const base = total.value < 0n ? -total.value : total.value;
    const percent = (part * 10000n) / base;
    const whole = percent / 100n;
    const frac = (percent % 100n).toString().padStart(2, "0");
    return `${whole}.${frac}`;
  }
}
