"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Minimal, dependency-free command palette with Tailwind v4 classes.
// - Opens over the app shell
// - Fuzzy-ish contains match over command title and keywords
// - Arrow keys to navigate, Enter to run, Esc to close

export default function CommandPalette({ open, onClose, commands = [] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const router = useRouter();

  // Normalize commands: { id, title, subtitle?, action, keywords?: string[], group?: string }
  const items = Array.isArray(commands) ? commands : [];

  useEffect(() => {
    if (open) {
      // Reset on open and focus input
      setQuery("");
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) run(cmd);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => {
      const hay = [c.title, c.subtitle, ...(c.keywords || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  function run(cmd) {
    if (!cmd) return;
    if (cmd.href) {
      // Consider route navigations as commands
      router.push(cmd.href);
    } else if (typeof cmd.action === "function") {
      cmd.action();
    }
    onClose?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/10 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="cmdp-title">
      <div className="absolute top-0 left-0 right-0 flex justify-center p-3">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl overflow-hidden">
          <h2 id="cmdp-title" className="sr-only">Command Palette</h2>
          <div className="border-b border-border p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command…"
              className="w-full bg-white border border-border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              aria-label="Command search"
            />
            <div className="text-xs text-muted mt-1 px-1">Cmd/Ctrl+Enter to open • Esc to close • ↑/↓ to navigate</div>
          </div>
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2 bg-white">
            {filtered.length === 0 && (
              <div className="text-sm text-muted px-2 py-3">No commands match that query.</div>
            )}
            {filtered.map((c, i) => (
              <button
                key={c.id || c.title + i}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(c)}
                className={`w-full text-left px-3 py-2 rounded-xl border transition-colors ${
                  i === active
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-slate-50"
                }`}
              >
                <div className="text-sm text-fg">{c.title}</div>
                {c.subtitle && <div className="text-xs text-muted mt-0.5">{c.subtitle}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
