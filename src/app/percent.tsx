export function Percent({ value, onDark = false }: { value: string | null; onDark?: boolean }) {
  if (!value) return <span className={onDark ? "text-white/50" : "text-[#666]"}>—</span>;
  const negative = value.startsWith("-");
  const zero = Number(value) === 0;
  const tone = zero ? "text-[#171717]" : negative ? "text-[#30a46c]" : "text-[#e5484d]";
  return (
    <span className={`num ${tone}`}>
      {negative || zero ? "" : "+"}
      {value}%
    </span>
  );
}

export function amountLabel(amount: string) {
  return !amount || amount === "0" || amount === "0.00" ? "免费" : `$${amount}/月`;
}
