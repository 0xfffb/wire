const marks: Record<string, { label: string; color: string }> = {
  futu: { label: "富途", color: "#ff6a00" },
};

export function BrokerMark({ id, size = 28 }: { id: string; size?: number }) {
  const mark = marks[id] ?? { label: id, color: "#171717" };
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white"
      style={{ width: size, height: size, background: mark.color }}
      aria-hidden
    >
      {mark.label.slice(0, 1)}
    </span>
  );
}

export function brokerName(id: string) {
  return marks[id]?.label ?? id;
}
