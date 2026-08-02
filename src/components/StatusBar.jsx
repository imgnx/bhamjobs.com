"use client";

import { useMemo } from "react";

export default function StatusBar({ cells = [] }) {
  const items = useMemo(() => [
    { id: 'market-status', content: 'Market data: Live' },
    ...cells,
  ], [cells]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-3 py-2">
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          {items.map((c, i) => (
            <div key={c.id || i} className="rounded-md border border-slate-200 bg-white px-2 py-1">
              {typeof c.content === 'function' ? c.content() : c.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
