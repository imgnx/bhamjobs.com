"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function VoteButton({ boardSlug, threadId, initialVotes }) {
  const router = useRouter();
  const [votes, setVotes] = useState(initialVotes ?? 0);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleVote() {
    setError("");
    setVotes((v) => v + 1);
    try {
      const res = await fetch(`/api/boards/${boardSlug}/threads/${threadId}/vote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Unable to record vote.");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setVotes((v) => Math.max(0, v - 1));
      setError(err.message || "Unable to record vote.");
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleVote}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <span>▲ Upvote</span>
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">{votes}</span>
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

