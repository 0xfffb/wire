"use client";

import { CandlestickChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { useEffect, useRef, useState } from "react";
import type { ReturnPoint } from "@/read/portfolio";

echarts.use([CandlestickChart, GridComponent, TooltipComponent, SVGRenderer]);

const YEAR = 365 * 24 * 60 * 60 * 1000;
const periods = [
  ["day", "日"],
  ["week", "周"],
  ["month", "月"],
  ["year", "年"],
] as const;

type Period = (typeof periods)[number][0];

function bucketKey(at: number, period: Period) {
  const day = new Date(at);
  const year = day.getFullYear();
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  if (period === "day") return `${year}-${month}-${date}`;
  if (period === "month") return `${year}-${month}`;
  if (period === "year") return String(year);
  const monday = new Date(day);
  monday.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const weekMonth = String(monday.getMonth() + 1).padStart(2, "0");
  const weekDate = String(monday.getDate()).padStart(2, "0");
  return `${monday.getFullYear()}-${weekMonth}-${weekDate}`;
}

function candlesFor(points: ReturnPoint[], period: Period) {
  const from = Date.now() - YEAR;
  const recent = points.filter((point) => point.at >= from);
  const rows = recent.length > 0 ? recent : points;
  const byBucket = new Map<string, { open: number; high: number; low: number; close: number }>();
  for (const point of rows) {
    const key = bucketKey(point.at, period);
    const bar = byBucket.get(key);
    if (!bar) {
      byBucket.set(key, { open: point.rate, high: point.rate, low: point.rate, close: point.rate });
    } else {
      bar.high = Math.max(bar.high, point.rate);
      bar.low = Math.min(bar.low, point.rate);
      bar.close = point.rate;
    }
  }
  return [...byBucket.entries()].map(([label, bar]) => ({ label, ...bar }));
}

export function ReturnChart({ points, height = 160 }: { points: ReturnPoint[]; height?: number }) {
  const node = useRef<HTMLDivElement>(null);
  const [period, setPeriod] = useState<Period>("month");
  const [error, setError] = useState("");
  const compact = height < 120;

  useEffect(() => {
    const container = node.current;
    if (!container || points.length === 0) return;
    try {
      const chart = echarts.init(container, undefined, { renderer: "svg", height });
      const candles = candlesFor(points, period);
      chart.setOption({
        animation: false,
        grid: { left: compact ? 8 : 48, right: 8, top: 12, bottom: compact ? 8 : 28 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
          formatter(raw: unknown) {
            const item = (Array.isArray(raw) ? raw[0] : raw) as { axisValue?: string | number; data?: unknown } | undefined;
            const data = Array.isArray(item?.data) ? item.data.map(Number) : [];
            const [open = 0, close = 0, low = 0, high = 0] = data;
            return `${item?.axisValue ?? ""}<br/>开 ${open.toFixed(2)}%<br/>收 ${close.toFixed(2)}%<br/>高 ${high.toFixed(2)}%<br/>低 ${low.toFixed(2)}%`;
          },
        },
        xAxis: {
          type: "category",
          data: candles.map((bar) => bar.label),
          axisLine: { lineStyle: { color: "#eee" } },
          axisLabel: { color: "#999", fontSize: 10, show: !compact },
          axisTick: { show: false },
        },
        yAxis: {
          scale: true,
          axisLabel: {
            color: "#999",
            fontSize: 10,
            show: !compact,
            formatter: (value: number) => `${value}%`,
          },
          splitLine: { lineStyle: { color: "#f2f2f2" } },
        },
        series: [
          {
            type: "candlestick",
            data: candles.map((bar) => [bar.open, bar.close, bar.low, bar.high]),
            itemStyle: {
              color: "#e5484d",
              color0: "#30a46c",
              borderColor: "#e5484d",
              borderColor0: "#30a46c",
            },
          },
        ],
      });
      const observer = new ResizeObserver(() => chart.resize());
      observer.observe(container);
      return () => {
        observer.disconnect();
        chart.dispose();
      };
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "图表加载失败");
    }
  }, [compact, height, period, points]);

  if (points.length === 0) {
    return <p className="text-sm text-[#666]">还没有同步快照，曲线会在下次同步后出现。</p>;
  }

  return (
    <div>
      <div className="mb-1 flex gap-1">
        {periods.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`h-5 rounded px-1.5 text-[11px] ${period === id ? "bg-black text-white" : "text-[#666] hover:text-black"}`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setPeriod(id);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <p className="text-sm text-[#e5484d]">{error}</p> : null}
      <div ref={node} style={{ height }} />
    </div>
  );
}
