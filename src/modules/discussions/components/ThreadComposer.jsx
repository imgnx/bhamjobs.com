"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const FEATURE_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "PLANNED", label: "Planned" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function ThreadComposer({ boardSlug, boardKind }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const showStatus = boardKind === "FEATURE";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {
      title: title.trim(),
      body: body.trim(),
      author: author.trim(),
    };
    if (showStatus) payload.status = status;

    try {
      const res = await fetch(`/api/boards/${boardSlug}/threads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to create thread.");
      }
      const data = await res.json();
      setTitle("");
      setBody("");
      setAuthor("");
      startTransition(() => {
        router.push(`/boards/${boardSlug}/${data.id}`);
        router.refresh();
      });
    } catch (err) {
      setError(err.message || "Failed to create thread.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white/80 border border-border p-4 shadow-sm">
      <div>
        <label htmlFor="thread-title" className="block text-xs font-medium text-muted uppercase tracking-wide">
          Title
        </label>
        <input
          id="thread-title"
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Share a topic…"
        />
      </div>
      <div>
        <label htmlFor="thread-body" className="block text-xs font-medium text-muted uppercase tracking-wide">
          Details
        </label>
        <textarea
          id="thread-body"
          required
          minLength={3}
          maxLength={3000}
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Add context, links, or steps…"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="thread-author" className="block text-xs font-medium text-muted uppercase tracking-wide">
            Display name (optional)
          </label>
          <input
            id="thread-author"
            maxLength={60}
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Anonymous"
          />
        </div>
        {showStatus && (
          <div>
            <label htmlFor="thread-status" className="block text-xs font-medium text-muted uppercase tracking-wide">
              Status
            </label>
            <select
              id="thread-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {FEATURE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-95 disabled:opacity-50"
      >
        {isPending ? "Posting…" : "Create thread"}
      </button>
      <p className="text-xs text-muted">
        Keep posts respectful and under 3,000 characters. Feature requests support optional status tracking.
      </p>
    </form>
  );
}
