"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceItem {
  market_title: string;
  pnl: number;
  amount_bet: number;
  status: "WON" | "LOST" | "REFUNDED";
}

interface PerformanceBreakdownProps {
  performance: PerformanceItem[];
}

export function PerformanceBreakdown({ performance }: PerformanceBreakdownProps) {
  const data = useMemo(() => {
    return performance
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 10)
      .map((item) => ({
        name: item.market_title.length > 20 ? item.market_title.slice(0, 17) + "..." : item.market_title,
        pnl: item.pnl,
        fullName: item.market_title,
        status: item.status,
      }));
  }, [performance]);

  const wins = performance.filter((p) => p.pnl > 0).length;
  const losses = performance.filter((p) => p.pnl < 0).length;
  const totalPnL = performance.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="mb-4 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="text-xs text-zinc-400">Wins</div>
          <div className="text-lg font-semibold text-green-400">{wins}</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="text-xs text-zinc-400">Losses</div>
          <div className="text-lg font-semibold text-red-400">{losses}</div>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3">
          <div className="text-xs text-zinc-400">Total P&L</div>
          <div className={`text-lg font-semibold ${totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      <h3 className="mb-3 text-sm font-semibold text-zinc-100">Top Markets by Impact</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#a1a1aa" />
            <Tooltip
              contentStyle={{
                background: "#09090b",
                borderColor: "#3f3f46",
                color: "#fafafa",
              }}
              formatter={(value) => `$${value}`}
              labelFormatter={(label) => `Market: ${label}`}
            />
            <Bar dataKey="pnl" fill="#22c55e" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey="pnl"
                  fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PerformanceBreakdown;
