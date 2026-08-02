"use client";

import CommandPalette from "../src/components/CommandPalette.jsx";
import StatusBar from "../src/components/StatusBar.jsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommandPaletteHotkey } from "../src/hooks/useCommandPaletteHotkey.js";

export default function ClientShell({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [theme, setTheme] = useState('trivium-rhetoric');
  const [isAdmin, setIsAdmin] = useState(false);
  const [voicePlaybackEnabled, setVoicePlaybackEnabled] = useState(false);
  const [voicePlaybackSupported, setVoicePlaybackSupported] = useState(false);
  const [online, setOnline] = useState(true);
  useCommandPaletteHotkey(() => setPaletteOpen((v) => !v));
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  // Theme apply + persist
  const applyTheme = useCallback((t) => {
    try {
      if (!isAdmin) return; // gate: only admins may switch theme
      document.body.dataset.theme = t;
      localStorage.setItem('theme', t);
      setTheme(t);
    } catch {}
  }, [isAdmin]);

  // Verify admin and initialize theme
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const token = localStorage.getItem('admin_token');
        if (token) {
          const res = await fetch('/api/admin/verify', { headers: { Authorization: `Bearer ${token}` } });
          if (!cancelled && res.ok) {
            setIsAdmin(true);
            const stored = localStorage.getItem('theme');
            const initial = stored || document.body.dataset.theme || 'trivium-rhetoric';
            if (initial) {
              document.body.dataset.theme = initial;
              setTheme(initial);
            }
            return;
          }
        }
      } catch {}
      if (!cancelled) {
        setIsAdmin(false);
        // enforce default for non-admins
        document.body.dataset.theme = 'trivium-rhetoric';
        setTheme('trivium-rhetoric');
        try { localStorage.removeItem('theme'); } catch {}
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setVoicePlaybackSupported(supported);
    if (supported) {
      try {
        setVoicePlaybackEnabled(localStorage.getItem('chat_voice_enabled') === 'true');
      } catch {}
    }
    function onVoicePlaybackChanged(e) {
      const detail = e?.detail || {};
      if (typeof detail.supported === 'boolean') setVoicePlaybackSupported(detail.supported);
      if (typeof detail.enabled === 'boolean') setVoicePlaybackEnabled(detail.enabled);
    }
    window.addEventListener('voice:playback-changed', onVoicePlaybackChanged);
    return () => window.removeEventListener('voice:playback-changed', onVoicePlaybackChanged);
  }, []);

  useEffect(() => {
    const updateOnline = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const adminSignIn = useCallback(async () => {
    try {
      const token = window.prompt('Enter admin API token');
      if (!token) return;
      const res = await fetch('/api/admin/verify', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        localStorage.setItem('admin_token', token);
        setIsAdmin(true);
      } else {
        alert('Invalid token');
        setIsAdmin(false);
      }
    } catch {}
  }, []);

  const adminSignOut = useCallback(() => {
    try {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('theme');
      setIsAdmin(false);
      document.body.dataset.theme = 'trivium-rhetoric';
      setTheme('trivium-rhetoric');
    } catch {}
  }, []);

  const commands = useMemo(() => [
    { id: 'go-home', title: 'Go: Home', subtitle: 'Open the main chat', href: '/', keywords: ['navigate','root','chat','home'] },
    { id: 'go-payments', title: 'Go: Payments', subtitle: 'Manage or test payments', href: '/payments', keywords: ['navigate','checkout','billing'] },
    { id: 'go-payments-success', title: 'Go: Payment Success', href: '/payments/success', keywords: ['navigate'] },
    { id: 'go-payments-cancel', title: 'Go: Payment Canceled', href: '/payments/cancel', keywords: ['navigate'] },
    { id: 'go-boards', title: 'Go: Boards', subtitle: 'Community discussions and feedback', href: '/boards', keywords: ['navigate','forum','feedback','community'] },
    { id: 'go-board-discussions', title: 'Go: Board — Discussions', href: '/boards/discussions', keywords: ['navigate','forum','discussions'] },
    { id: 'go-board-bulletin', title: 'Go: Board — Bulletin', href: '/boards/bulletin', keywords: ['navigate','bulletin','announcements'] },
    { id: 'go-board-features', title: 'Go: Board — Feature Requests', href: '/boards/feature-requests', keywords: ['navigate','feature','feedback','requests'] },
    { id: 'go-checkout', title: 'Action: Create Checkout Session', subtitle: 'POST /api/payments/create-checkout-session', action: async () => {
        try { await fetch('/api/payments/create-checkout-session', { method: 'POST' }); } catch {}
      }, keywords: ['payments','checkout','api'] },
    { id: 'show-status', title: 'Action: Show Connectivity', subtitle: 'Reveal online/offline banner', action: () => {
        try { window.dispatchEvent(new CustomEvent('statusbar:show')); } catch {}
      }, keywords: ['status','connectivity'] },
    { id: 'new-chat', title: 'Action: New Chat', subtitle: 'Clear current conversation', action: () => {
        try { localStorage.removeItem('chat_messages'); } catch {}
        window.location.href = '/';
      }, keywords: ['clear','reset'] },
    ...(isAdmin ? [
      { id: 'theme-rhetoric', title: 'Theme: Trivium — Rhetoric', subtitle: 'Primary: Violet', action: () => applyTheme('trivium-rhetoric'), keywords: ['theme','rhetoric','violet','primary'] },
      { id: 'theme-logic', title: 'Theme: Trivium — Logic', subtitle: 'Primary: Emerald', action: () => applyTheme('trivium-logic'), keywords: ['theme','logic','emerald','primary'] },
      { id: 'theme-grammar', title: 'Theme: Trivium — Grammar', subtitle: 'Primary: Amber', action: () => applyTheme('trivium-grammar'), keywords: ['theme','grammar','amber','primary'] },
      { id: 'admin-signout', title: 'Admin: Sign Out', action: adminSignOut, keywords: ['admin','logout','signout'] },
    ] : [
      { id: 'admin-signin', title: 'Admin: Sign In', subtitle: 'Enter API token to enable admin controls', action: adminSignIn, keywords: ['admin','signin','login'] },
    ]),
    { id: 'help', title: 'Help: Open Usage Docs', href: '/#usage', keywords: ['docs','readme','help'] },
    { id: 'voice-toggle', title: 'Action: Toggle Voice Recording', subtitle: 'Microphone → transcribe to input', action: () => {
        try { window.dispatchEvent(new CustomEvent('voice:toggle')); } catch {}
      }, keywords: ['voice','mic','record','transcribe','speech','asr'] },
    { id: 'voice-playback-toggle', title: voicePlaybackEnabled ? 'Voice Playback: Disable' : 'Voice Playback: Enable', subtitle: 'Speak assistant replies aloud', action: () => {
        try { window.dispatchEvent(new CustomEvent('voice:playback-toggle')); } catch {}
      }, keywords: ['voice','audio','speech','tts','accessibility'] },
  ], [applyTheme, isAdmin, adminSignIn, adminSignOut, voicePlaybackEnabled]);

  return (
    <>
      {/* Skip links for keyboard navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 translate-y-[-200%] focus-within:translate-y-0 transition">
        <div className="mx-auto max-w-5xl px-3 py-2">
          <div className="inline-flex gap-2 bg-white border border-border rounded-lg shadow-sm p-1">
            <a href="#main-content" className="px-3 py-1.5 rounded-md hover:bg-slate-50">Skip to main content</a>
            <a href="#composer-input" className="px-3 py-1.5 rounded-md hover:bg-slate-50">Skip to chat input</a>
            <button type="button" onClick={openPalette} className="px-3 py-1.5 rounded-md border border-border bg-white hover:bg-slate-50">Open Command Palette</button>
          </div>
        </div>
      </div>
      {/* Register service worker */}
      <script dangerouslySetInnerHTML={{__html:`
        (function(){
          if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
          const isProd = ${JSON.stringify(process.env.NODE_ENV === 'production')};
          const cachePrefix = 'app-shell';
          if (!isProd) {
            // In dev, avoid stale bundles by removing any existing SW + caches.
            navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(()=>{});
            if (window.caches?.keys) {
              caches.keys().then((keys) => keys.filter((k) => k.startsWith(cachePrefix)).forEach((k) => caches.delete(k))).catch(()=>{});
            }
            return;
          }
          window.addEventListener('load', function(){
            navigator.serviceWorker.register('/sw.js').catch(()=>{});
          });
        })();
      `}} />

      <aside className="hidden md:flex flex-col gap-4 p-4 border-r border-border bg-white/70 backdrop-blur-sm" aria-label="Chat sessions">
        <div className="font-semibold text-fg">Chats</div>
        <nav className="flex-1 overflow-auto space-y-2 pr-1">
          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/10 transition"
            onClick={() => { try { localStorage.removeItem('chat_messages'); } catch {}; window.location.href = '/'; }}
          >
            New Chat
          </button>
          <div className="text-xs uppercase text-muted pt-2">Recent</div>
          <ul className="space-y-1">
            <li><a className="block px-3 py-2 rounded-lg hover:bg-muted/10" href="#">Welcome</a></li>
            <li><a className="block px-3 py-2 rounded-lg hover:bg-muted/10" href="#">Job Search</a></li>
          </ul>
          <div className="text-xs uppercase text-muted pt-4">Boards</div>
          <ul className="space-y-1">
            <li><a className="block px-3 py-2 rounded-lg hover:bg-muted/10" href="/boards">All boards</a></li>
            <li><a className="block px-3 py-2 rounded-lg hover:bg-muted/10" href="/boards/discussions">Community discussions</a></li>
            <li><a className="block px-3 py-2 rounded-lg hover:bg-muted/10" href="/boards/bulletin">Bulletin board</a></li>
            <li><a className="block px-3 py-2 rounded-lg hover:bg-muted/10" href="/boards/feature-requests">Feature requests</a></li>
          </ul>
          <div className="text-xs text-muted">bhamjobs</div>
        </nav>
        <div className="text-xs text-muted">bhamjobs</div>
      </aside>

      <div className="flex flex-col h-svh">
        <header className="sticky top-0 z-10 border-b border-border bg-white/70 backdrop-blur-sm px-4 py-3" role="banner">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
            <div className="font-medium flex items-baseline gap-3">
              <span>Assistant</span>
              <span className="text-xs text-muted">Just log in and you've got a job!</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-xs text-muted">Press Cmd/Ctrl+Enter</div>
              <button
                type="button"
                onClick={openPalette}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                aria-label="Open Command Palette"
              >
                Open Command Palette
              </button>
              <a href="#shortcuts" className="text-xs underline underline-offset-4 decoration-primary/40 hover:decoration-primary/60">Keyboard Shortcuts</a>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto" role="main" aria-label="Main content">
          <div className="mx-auto max-w-3xl w-full px-4 py-6 space-y-4">
            <section id="shortcuts" aria-labelledby="shortcuts-heading" className="rounded-xl bg-white/80 border border-border shadow-sm p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="shortcuts-heading" className="text-sm font-medium">Keyboard navigation</h2>
                  <p className="text-xs text-muted">Tab/Shift+Tab to move • Enter/Space to activate • Esc to close panels</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={openPalette} className="rounded-md bg-primary text-white px-3 py-1.5 text-sm hover:brightness-95">Open Command Palette</button>
                </div>
              </div>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted">
                <li><span className="cmd-kbd">Cmd/Ctrl+Enter</span> — Open Command Palette</li>
                <li><span className="cmd-kbd">Tab</span>/<span className="cmd-kbd">Shift+Tab</span> — Move focus</li>
                <li><span className="cmd-kbd">Enter</span> — Send message / run command</li>
                <li><span className="cmd-kbd">Shift+Enter</span> — New line in message</li>
                <li><span className="cmd-kbd">Esc</span> — Close palette</li>
                <li><span className="cmd-kbd">↑</span>/<span className="cmd-kbd">↓</span> — Navigate commands</li>
              </ul>
            </section>
            {children}
          </div>
        </main>
        <footer className="sticky bottom-0 z-10 border-t border-border bg-white/80 backdrop-blur-sm px-4 py-3">
          <div className="mx-auto max-w-3xl text-center text-xs text-muted">
            AI responses may be inaccurate.
          </div>
        </footer>
      </div>

      {/* Route-desemanticized command surface: encourage actions over URLs */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <StatusBar cells={[
        ...(isAdmin ? [{ id: 'status-theme', content: `Theme: ${String((theme || '').replace('trivium-','') || 'rhetoric').replace('trivium','rhetoric')}` }] : []),
        { id: 'status-voice', content: voicePlaybackSupported ? `Voice: ${voicePlaybackEnabled ? 'On' : 'Off'}` : 'Voice: Unavailable' },
        { id: 'status-connection', content: online ? 'Online' : 'Offline' },
        { id: 'status-build', content: 'Build: v1' },
        { id: 'status-help', content: 'Help: Type "help" in Command Palette' },
      ]} />
    </>
  );
}
