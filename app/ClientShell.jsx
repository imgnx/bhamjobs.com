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

  const openPostJobForm = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.location.href = '/#post-job';
      return;
    }
    window.dispatchEvent(new CustomEvent('jobs:open-post-form'));
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
    { id: 'post-job', title: 'Action: Post a Job', subtitle: 'Open the employer posting form', action: openPostJobForm, keywords: ['job','post','employer','role','hiring'] },
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
  ], [applyTheme, isAdmin, adminSignIn, adminSignOut, openPostJobForm, voicePlaybackEnabled]);

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

      <aside className="hidden md:flex flex-col gap-5 border-r border-slate-200 bg-slate-950 p-4 text-white" aria-label="Primary navigation">
        <div>
          <div className="text-xl font-semibold tracking-normal">bhamjobs</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">Birmingham, AL</div>
        </div>
        <nav className="flex-1 overflow-auto space-y-2 pr-1">
          <button
            className="w-full rounded-md bg-emerald-600 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-emerald-500"
            onClick={() => { try { localStorage.removeItem('chat_messages'); } catch {}; window.location.href = '/'; }}
          >
            New search
          </button>
          <div className="pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Marketplace</div>
          <ul className="space-y-1 text-sm">
            <li><a className="block rounded-md bg-white/10 px-3 py-2 text-white no-underline" href="/">Job desk</a></li>
            <li>
              <button
                type="button"
                onClick={openPostJobForm}
                className="block w-full rounded-md px-3 py-2 text-left text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Post a job
              </button>
            </li>
            <li><a className="block rounded-md px-3 py-2 text-slate-300 no-underline hover:bg-white/10 hover:text-white" href="/boards">Talent boards</a></li>
            <li><a className="block rounded-md px-3 py-2 text-slate-300 no-underline hover:bg-white/10 hover:text-white" href="/payments">Employer billing</a></li>
          </ul>
          <div className="pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Community</div>
          <ul className="space-y-1 text-sm">
            <li><a className="block rounded-md px-3 py-2 text-slate-300 no-underline hover:bg-white/10 hover:text-white" href="/boards/discussions">Discussions</a></li>
            <li><a className="block rounded-md px-3 py-2 text-slate-300 no-underline hover:bg-white/10 hover:text-white" href="/boards/bulletin">Bulletin</a></li>
            <li><a className="block rounded-md px-3 py-2 text-slate-300 no-underline hover:bg-white/10 hover:text-white" href="/boards/feature-requests">Feature requests</a></li>
          </ul>
        </nav>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-sm font-semibold">Employer hotline</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">Priority posting review and candidate routing for Birmingham hiring teams.</div>
        </div>
      </aside>

      <div className="flex flex-col h-svh">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur" role="banner">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Metro Birmingham job supply</div>
              <div className="text-lg font-semibold text-slate-950">Hiring desk</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openPalette}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                aria-label="Open Command Palette"
              >
                Command menu
              </button>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto" role="main" aria-label="Main content">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
            {children}
          </div>
        </main>
        <footer className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Verified local employers · Birmingham metro coverage</span>
            <span>Assistant guidance is reviewed against local market data.</span>
          </div>
        </footer>
      </div>

      {/* Route-desemanticized command surface: encourage actions over URLs */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <StatusBar cells={[
        ...(isAdmin ? [{ id: 'status-theme', content: `Theme: ${String((theme || '').replace('trivium-','') || 'rhetoric').replace('trivium','rhetoric')}` }] : []),
        { id: 'status-voice', content: voicePlaybackSupported ? `Voice: ${voicePlaybackEnabled ? 'On' : 'Off'}` : 'Voice: Unavailable' },
        { id: 'status-connection', content: online ? 'Online' : 'Offline' },
        { id: 'status-build', content: 'Release: v1' },
      ]} />
    </>
  );
}
