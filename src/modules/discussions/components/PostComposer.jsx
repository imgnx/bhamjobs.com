"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PostComposer({ boardSlug, threadId }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      const res = await fetch(`/api/boards/${boardSlug}/threads/${threadId}/posts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          author: author.trim(),
        }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to reply.");
      }
      setBody("");
      setAuthor("");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err.message || "Failed to reply.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white/80 border border-border p-4 shadow-sm">
      <div>
        <label htmlFor="reply-body" className="block text-xs font-medium text-muted uppercase tracking-wide">
          Reply
        </label>
        <textarea
          id="reply-body"
          required
          minLength={3}
          maxLength={2500}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Share your thoughts…"
        />
      </div>
      <div>
        <label htmlFor="reply-author" className="block text-xs font-medium text-muted uppercase tracking-wide">
          Display name (optional)
        </label>
        <input
          id="reply-author"
          maxLength={60}
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Anonymous"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Post reply"}
      </button>
    </form>
  );
}
