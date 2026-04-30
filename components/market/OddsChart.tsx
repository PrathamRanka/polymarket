"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

interface OddsChartProps {
  marketId: string;
  currentProb: number;
}

interface ChartRow {
  date: string;
  prob: number;
}

function generateHistory(currentProb: number): ChartRow[] {
  const rows: ChartRow[] = [];
  let value = currentProb;

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);

    value += (Math.random() - 0.5) * 0.06;
    value = Math.max(0.05, Math.min(0.95, value));

    rows.push({
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      prob: Number((value * 100).toFixed(2)),
    });
  }

  return rows;
}

export function OddsChart({ marketId, currentProb }: OddsChartProps) {
  const data = useMemo(() => generateHistory(currentProb), [currentProb, marketId]);
  const lineColor = currentProb >= 0.5 ? "#22c55e" : "#ef4444";

  return (
    <div className="h-72 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="#a1a1aa" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} stroke="#a1a1aa" tick={{ fontSize: 12 }} unit="%" />
          <Tooltip
            contentStyle={{
              background: "#09090b",
              borderColor: "#3f3f46",
              color: "#fafafa",
            }}
            formatter={(value: number) => `${value}% YES`}
          />
          <ReferenceLine y={50} stroke="#71717a" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="prob"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OddsChart;
