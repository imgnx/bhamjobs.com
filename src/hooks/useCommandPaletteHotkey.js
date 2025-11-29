"use client";

import { useEffect } from "react";

// Listens for Cmd/Ctrl + Enter to toggle the palette.
export function useCommandPaletteHotkey(onToggle) {
  useEffect(() => {
    function onKey(e) {
      const isEnter = e.key === "Enter";
      const cmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isEnter && cmdOrCtrl) {
        e.preventDefault();
        onToggle?.();
      }
    }
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggle]);
}

