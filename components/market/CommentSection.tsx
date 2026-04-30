import { createClient } from "@/lib/supabase/server";

interface CommentAuthorRow {
  username: string;
  rank: string;
}

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  users: CommentAuthorRow[] | CommentAuthorRow | null;
}

interface CommentSectionProps {
  marketId: string;
}

export async function CommentSection({ marketId }: CommentSectionProps) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id,content,created_at,users(username,rank)")
    .eq("market_id", marketId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <h2 className="text-lg font-semibold text-zinc-100">Discussion</h2>
      <div className="mt-4 space-y-3">
        {(data ?? []).map((comment: CommentRow) => {
          const user = Array.isArray(comment.users) ? comment.users[0] : comment.users;
          return (
            <article key={comment.id} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-sm text-zinc-200">{comment.content}</p>
              <p className="mt-2 text-xs text-zinc-500">
                @{user?.username ?? "anonymous"} · {new Date(comment.created_at).toLocaleString()}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default CommentSection;
