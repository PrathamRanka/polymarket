import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/types";

interface LeaderboardReportRow {
  rank: number;
  username: string;
  score: number;
  wins: number;
  losses: number;
  win_rate: number;
  streak: number;
}

async function fetchEntries(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();
  const rpcClient = supabase as typeof supabase & {
    rpc: (
      procedure: string,
      args: { p_limit: number },
    ) => Promise<{ data: LeaderboardReportRow[] | null; error: { message: string } | null }>;
  };

  const { data, error } = await rpcClient.rpc("get_leaderboard_report", { p_limit: 100 });

  if (error || !data) {
    return [];
  }

  return data.map((row: LeaderboardReportRow) => ({
      rank: row.rank,
      user: {
        id: `user-${row.rank}`,
        username: row.username,
        rank: "Novice",
        streak_count: row.streak,
      },
      score: row.score,
      wins: row.wins,
      losses: row.losses,
      win_rate: row.win_rate,
      total_wagered: 0,
    }));
}

export default async function LeaderboardPage() {
  const entries = await fetchEntries();

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-100">Top Predictors</h1>
        <p className="text-sm text-zinc-400">Live leaderboard updates every minute.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {entries.slice(0, 3).map((entry, index) => (
          <article key={entry.rank} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-500">#{index + 1}</p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-100">{entry.user.username}</h2>
            <p className="mt-1 text-sm text-zinc-300">Score {Math.round(entry.score).toLocaleString()}</p>
            <p className="text-sm text-zinc-400">Win rate {Math.round(entry.win_rate * 100)}%</p>
          </article>
        ))}
      </section>

      <LeaderboardTable entries={entries.slice(3)} />
    </main>
  );
}
