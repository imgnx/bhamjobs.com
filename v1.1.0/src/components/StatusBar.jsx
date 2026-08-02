"use client";

import { useEffect, useMemo, useState } from "react";

function platformHint() {
  if (typeof navigator === 'undefined') return 'Cmd+Enter';
  const p = navigator.platform.toLowerCase();
  // crude detector for mac vs others
  return /mac|iphone|ipad|ipod/.test(p) ? 'Cmd+Enter' : 'Ctrl+Enter';
}

export default function StatusBar({ cells = [] }) {
  const [combo, setCombo] = useState('Cmd/Ctrl+Enter');
  useEffect(() => setCombo(platformHint()), []);

  const items = useMemo(() => [
    { id: 'cmd-palette', content: `Command Palette: ${combo}` },
    ...cells,
  ], [cells, combo]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl w-full px-3 py-2">
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          {items.map((c, i) => (
            <div key={c.id || i} className="rounded-md border border-border bg-white px-2 py-1">
              {typeof c.content === 'function' ? c.content() : c.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
