"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Transaction } from "@/types";

interface ROIChartProps {
  transactions: Transaction[];
}

export function ROIChart({ transactions }: ROIChartProps) {
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

  const chartData = useMemo(() => {
    const now = Date.now();
    const filtered = transactions
      .filter((tx) => {
        if (range === "all") return true;
        const days = range === "7d" ? 7 : 30;
        return now - new Date(tx.created_at).getTime() <= days * 24 * 60 * 60 * 1000;
      })
      .slice()
      .reverse();

    let running = 0;
    return filtered.map((tx) => {
      running += tx.amount;
      return {
        date: new Date(tx.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        value: running,
      };
    });
  }, [range, transactions]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-zinc-100">ROI Trend</h2>
        <div className="inline-flex rounded-md border border-zinc-700 p-1">
          {(["7d", "30d", "all"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              className={`rounded px-3 py-1 text-xs ${range === item ? "bg-zinc-200 text-zinc-950" : "text-zinc-200"}`}
            >
              {item.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="roi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#22c55e" fill="url(#roi)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export default ROIChart;
