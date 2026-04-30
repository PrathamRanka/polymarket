import { getRankColor } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-800 text-sm">
        <thead className="bg-zinc-900 text-zinc-300">
          <tr>
            <th className="px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">Player</th>
            <th className="px-3 py-3 text-left">Score</th>
            <th className="px-3 py-3 text-left">Wins</th>
            <th className="px-3 py-3 text-left">Losses</th>
            <th className="px-3 py-3 text-left">Win Rate</th>
            <th className="px-3 py-3 text-left">Streak</th>
            <th className="px-3 py-3 text-left">Rank</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={`${entry.user.username}-${entry.rank}`} className={index % 2 === 0 ? "bg-zinc-950" : "bg-zinc-900"}>
              <td className="px-3 py-3">{entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}</td>
              <td className="px-3 py-3">{entry.user.username}</td>
              <td className="px-3 py-3">{Math.round(entry.score).toLocaleString()}</td>
              <td className="px-3 py-3">{entry.wins}</td>
              <td className="px-3 py-3">{entry.losses}</td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span>{Math.round(entry.win_rate * 100)}%</span>
                  <div className="h-2 w-24 rounded-full bg-zinc-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(entry.win_rate * 100)}%` }} />
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">{entry.user.streak_count}</td>
              <td className={`px-3 py-3 ${getRankColor(entry.user.rank)}`}>{entry.user.rank}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LeaderboardTable;
