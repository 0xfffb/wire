"use client";

import { useEffect, useRef, useState } from "react";
import { CandlestickSeries, ColorType, createChart, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import type { ReturnPoint } from "@/read/portfolio";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

function monthTime(at: number) {
  const day = new Date(at);
  return Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), 1) / 1000) as UTCTimestamp;
}

function monthlyCandles(points: ReturnPoint[], from: number) {
  const byTime = new Map<number, { time: UTCTimestamp; open: number; high: number; low: number; close: number }>();
  for (const point of points) {
    if (Math.floor(point.at / 1000) < from) continue;
    const time = monthTime(point.at);
    const bar = byTime.get(time);
    if (!bar) {
      byTime.set(time, { time, open: point.rate, high: point.rate, low: point.rate, close: point.rate });
    } else {
      bar.high = Math.max(bar.high, point.rate);
      bar.low = Math.min(bar.low, point.rate);
      bar.close = point.rate;
    }
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

export function ReturnChart({
  points,
  height = 160,
}: {
  points: ReturnPoint[];
  height?: number;
  onDark?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const container = node.current;
    if (!container) return;
    try {
      const next = createChart(container, {
        height,
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#666", fontFamily: "var(--font-geist-sans), sans-serif" },
        grid: { vertLines: { color: "#f2f2f2" }, horzLines: { color: "#f2f2f2" } },
        rightPriceScale: { borderColor: "#eee" },
        timeScale: { borderColor: "#eee", timeVisible: false },
        handleScroll: true,
        handleScale: true,
      });
      const series = next.addSeries(CandlestickSeries, {
        upColor: "#e5484d",
        downColor: "#30a46c",
        borderUpColor: "#e5484d",
        borderDownColor: "#30a46c",
        wickUpColor: "#e5484d",
        wickDownColor: "#30a46c",
      });
      const to = Math.floor(Date.now() / 1000);
      const from = to - YEAR_SECONDS;
      const data = monthlyCandles(points, from);
      if (data.length > 0) series.setData(data);
      next.timeScale().setVisibleRange({ from: from as UTCTimestamp, to: to as UTCTimestamp });
      chart.current = next;
      const observer = new ResizeObserver(() => next.applyOptions({ width: container.clientWidth }));
      observer.observe(container);
      return () => {
        observer.disconnect();
        next.remove();
        chart.current = null;
      };
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图表加载失败");
    }
  }, [height, points]);

  return (
    <div>
      <div className="mb-1 text-[11px] text-[#888]">月K · 近一年</div>
      {error ? <p className="text-sm text-[#e5484d]">{error}</p> : null}
      {points.length === 0 ? <p className="text-sm text-[#666]">还没有同步快照，曲线会在下次同步后出现。</p> : <div ref={node} />}
    </div>
  );
}
