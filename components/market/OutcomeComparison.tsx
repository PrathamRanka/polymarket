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
  Legend,
} from "recharts";

interface Outcome {
  id: string;
  label: string;
  stake: number;
}

interface OutcomeComparisonProps {
  outcomes: Outcome[];
  totalStake: number;
}

interface ChartRow {
  date: string;
  [key: string]: string | number;
}

function generateOutcomeHistory(outcomes: Outcome[], totalStake: number): ChartRow[] {
  const rows: ChartRow[] = [];
  const colorPalette = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const row: ChartRow = {
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };

    outcomes.forEach((o) => {
      const variance = (Math.random() - 0.5) * 0.06;
      const baseProb = o.stake / (totalStake || 1);
      const prob = Math.max(0.05, Math.min(0.95, baseProb + variance));
      row[String(o.id)] = Number((prob * 100).toFixed(2));
    });

    rows.push(row);
  }

  return rows;
}

const colorMap: { [key: string]: string } = {
  YES: "#22c55e",
  NO: "#ef4444",
};

export function OutcomeComparison({ outcomes, totalStake }: OutcomeComparisonProps) {
  const data = useMemo(
    () => generateOutcomeHistory(outcomes, totalStake),
    [outcomes, totalStake]
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
      <h3 className="mb-2 text-sm font-semibold text-zinc-100">Outcome Odds Comparison</h3>
      <div className="h-72 w-full">
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
              formatter={(value) => `${value}%`}
            />
            <Legend wrapperStyle={{ color: "#a1a1aa" }} />
            {outcomes.map((o) => (
              <Line
                key={o.id}
                type="monotone"
                dataKey={o.id}
                stroke={colorMap[o.label] || '#8884d8'}
                strokeWidth={2}
                dot={false}
                name={o.label}
                animationDuration={800}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default OutcomeComparison;
