"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface CommentComposerProps {
  marketId: string;
}

export function CommentComposer({ marketId }: CommentComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();

    if (!trimmed) {
      setError("Add a short comment first.");
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/markets/${marketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to post comment");
      }

      setContent("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div>
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Quick discussion
        </label>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Share your take, ask a question, or flag something interesting..."
          className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 p-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">Keep it short and on-topic.</p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Posting..." : "Post discussion"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </form>
  );
}

export default CommentComposer;