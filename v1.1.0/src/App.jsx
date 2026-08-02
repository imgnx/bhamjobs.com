/*
  bhamjobs — Auth‑Gated Chat Assistant (React + Tailwind, Webpack)
  -----------------------------------------------------------------
  One‑file React prototype that:
    • Gates the chat assistant behind login (like ChatGPT)
    • Provides minimal Job Listings UI + Assistant drawer
    • Uses localStorage token as a mock session
    • Stubbed API layer for auth/jobs/chat

  Notes
  -----
  - TailwindCSS assumed (index.css includes @tailwind base; components; utilities)
  - Works in a standard Webpack + React setup
  - Replace MockAPI with real endpoints/JWT when ready
  - Accessibility: buttons have aria-labels, input labels wired up
*/

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useChatApi } from "./hooks/useChatApi.js";
import { usePublicChatApi } from "./hooks/usePublicChatApi.js";

// -----------------------------
// Mock API (replace later)
// -----------------------------
const MockAPI = {
  login: async (email, password) => {
    await delay(500);
    if (!email || !password) throw new Error("Missing credentials");
    // return a fake JWT-like token
    return { token: btoa(`${email}|${Date.now()}`), user: { email } };
  },
  me: async (token) => {
    await delay(250);
    if (!token) throw new Error("No token");
    const email = atob(token).split("|")[0];
    return { email };
  },
  jobs: async (query = {}) => {
    await delay(300);
    const seed = [
      {
        id: 1,
        title: "Welder (MIG/TIG)",
        company: "Iron City Fabrication",
        pay: "$22–$30/hr",
        location: "Birmingham, AL",
        tags: ["Trades", "Full‑time", "On‑site"],
      },
      {
        id: 2,
        title: "Medical Assistant",
        company: "UAB Health System",
        pay: "$18–$24/hr",
        location: "Birmingham, AL",
        tags: ["Healthcare", "Full‑time"],
      },
      {
        id: 3,
        title: "Junior Web Developer",
        company: "Magic City Tech",
        pay: "$55–$70k",
        location: "Hybrid — Birmingham",
        tags: ["Tech", "Hybrid", "JavaScript"],
      },
      {
        id: 4,
        title: "Barista / Shift Lead",
        company: "Railroad Park Coffee",
        pay: "$14–$18/hr + tips",
        location: "Downtown Birmingham",
        tags: ["Retail", "Part‑time"],
      },
    ];
    // naive filtering
    if (query.keyword) {
      const k = query.keyword.toLowerCase();
      return seed.filter((j) =>
        `${j.title} ${j.company} ${j.tags.join(" ")}`.toLowerCase().includes(k),
      );
    }
    return seed;
  },
  chat: async (messages) => {
    await delay(400);
    const last = messages[messages.length - 1]?.content || "";
    // super naive assistant
    if (/post a job/i.test(last))
      return {
        content:
          "To post a job, go to Employer → Post Job. Want me to open a draft form?",
      };
    if (/healthcare|nurse|medical/i.test(last))
      return {
        content:
          "Healthcare is hot in Birmingham. I found a Medical Assistant role at UAB Health. Want to see it?",
      };
    if (/how do i apply|apply/i.test(last))
      return {
        content:
          "Open a job and click ‘Apply Now’. I can filter roles for you—what field?",
      };
    return {
      content:
        "Hi! I’m your Birmingham job guide. Ask about roles, pay ranges, or how to post a job.",
    };
  },
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// -----------------------------
// Session utilities (SSR-safe)
// -----------------------------
const TOKEN_KEY = "bhamjobs.token";
const Session = {
  get() {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(TOKEN_KEY);
    } catch (_) {
      return null;
    }
  },
  set(token) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch (_) {}
  },
  clear() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch (_) {}
  },
};

// -----------------------------
// App Root
// -----------------------------
export default function App() {
  const [token, setToken] = useState(() => Session.get());
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) return setLoading(false);
      try {
        const user = await MockAPI.me(token);
        if (mounted) setMe(user);
      } catch (e) {
        console.warn(e);
        Session.clear();
        if (mounted) setMe(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (loading) return <Splash />;

  if (!token || !me) {
    return (
      <Login
        onLogin={(t, user) => {
          Session.set(t);
          setToken(t);
          setMe(user);
        }}
      />
    );
  }

  return (
    <Shell
      me={me}
      onLogout={() => {
        Session.clear();
        setToken(null);
        setMe(null);
      }}
    />
  );
}

// -----------------------------
// Splash / Loader
// -----------------------------
function Splash() {
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-100">
      <div className="animate-pulse text-center">
        <div className="text-3xl font-semibold">bhamjobs</div>
        <div className="text-sm opacity-70 mt-2">Loading…</div>
      </div>
    </div>
  );
}

// -----------------------------
// Login Page (auth gate like ChatGPT)
// -----------------------------
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAssistant, setShowAssistant] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token, user } = await MockAPI.login(email, password);
      onLogin(token, user);
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 grid place-items-center p-6">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-2xl font-semibold">Sign in to bhamjobs</div>
        <p className="text-sm opacity-70 mt-1">
          Log in for full assistant access and browsing. Or try the consumer version below.
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition px-4 py-2 font-medium"
          >
            {busy ? "Signing in…" : "Continue"}
          </button>
          <div className="text-xs opacity-70 text-center">
            By continuing you agree to our Terms & Privacy.
          </div>
        </form>
        <div className="mt-4 border-t border-neutral-800 pt-4">
          <div className="text-sm opacity-80 mb-2">Or try the consumer assistant:</div>
          <button
            aria-label="Try assistant"
            onClick={() => setShowAssistant(true)}
            className="w-full rounded-xl bg-neutral-800 hover:bg-neutral-700 px-4 py-2 text-sm"
          >
            Open Assistant (limited)
          </button>
        </div>
      </div>
      {showAssistant && (
        <AssistantDrawer onClose={() => setShowAssistant(false)} publicMode={true} />
      )}
    </div>
  );
}

// -----------------------------
// App Shell (post‑login)
// -----------------------------
function Shell({ me, onLogout }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <TopNav me={me} onLogout={onLogout} />
      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <HeroSearch />
          <JobResults />
        </section>
        <aside className="md:col-span-1 space-y-4">
          <TipsCard />
          <CityCard />
        </aside>
      </main>
      <AssistantFab />
    </div>
  );
}

function TopNav({ me, onLogout }) {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">bhamjobs</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-700/40">
            Birmingham, AL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80 hidden sm:inline">
            {me?.email}
          </span>
          <button
            aria-label="Post a job"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm"
          >
            Post a Job
          </button>
          <button
            aria-label="Sign out"
            onClick={onLogout}
            className="rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

// -----------------------------
// Search + Results
// -----------------------------
function HeroSearch() {
  const [keyword, setKeyword] = useState("");
  const [busy, setBusy] = useState(false);
  const [jobs, setJobs] = useState([]);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  async function runSearch(e) {
    e?.preventDefault();
    setBusy(true);
    const results = await MockAPI.jobs({ keyword });
    if (mounted.current) setJobs(results);
    setBusy(false);
  }

  useEffect(() => {
    runSearch();
  }, []);

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 mb-4">
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search roles, companies, skills…"
          className="flex-1 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4">
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      <JobList items={jobs} />
    </div>
  );
}

function JobResults() {
  return null;
}

function JobList({ items }) {
  if (!items?.length)
    return (
      <div className="text-sm opacity-70 p-4">
        No results yet. Try a different keyword.
      </div>
    );
  return (
    <div className="grid md:grid-cols-2 gap-3 mt-3">
      {items.map((j) => (
        <article
          key={j.id}
          className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
        >
          <div className="text-lg font-medium">{j.title}</div>
          <div className="text-sm opacity-80">
            {j.company} • {j.location}
          </div>
          <div className="text-sm mt-1">{j.pay}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {j.tags.map((t, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700"
              >
                {t}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded-xl bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm">
              View
            </button>
            <button className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-sm">
              Apply Now
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

// -----------------------------
// Sidebar Cards
// -----------------------------
function TipsCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="font-medium">Tips</div>
      <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
        <li>Use keywords: “welder”, “forklift”, “RN”, “JavaScript”.</li>
        <li>Toggle remote vs on‑site to narrow results.</li>
        <li>Set an alert after searching to get weekly updates.</li>
      </ul>
    </div>
  );
}

function CityCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="font-medium">Birmingham Snapshot</div>
      <div className="text-sm opacity-80 mt-1">
        Healthcare, manufacturing, and tech are strong sectors. Downtown & UAB
        area are hiring steadily.
      </div>
    </div>
  );
}

// -----------------------------
// Assistant (auth‑gated; floating action button + drawer)
// -----------------------------
function AssistantFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        aria-label="Open assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 rounded-full px-5 py-3 bg-emerald-600 hover:bg-emerald-500 shadow-xl"
      >
        Ask Birmingham
      </button>
      {open && <AssistantDrawer onClose={() => setOpen(false)} />}
    </>
  );
}

function AssistantDrawer({ onClose, publicMode = false }) {
  const [history, setHistory] = useState([
    {
      role: "assistant",
      content:
        "Hi! I’m your Birmingham job guide. Ask about roles, pay ranges, or how to post a job.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const viewRef = useRef(null);
  const { chat: privateChat } = useChatApi({
    // Prefer dev token via env; fall back to client session token
    token:
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_TOKEN) ||
      Session.get(),
  });
  const { chat: publicChat } = usePublicChatApi();

  useEffect(() => {
    viewRef.current?.scrollTo({
      top: viewRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history]);

  async function send(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const next = [...history, { role: "user", content: input.trim() }];
    setHistory(next);
    setInput("");
    setBusy(true);
    const res = await (publicMode ? publicChat(next) : privateChat(next));
    setHistory([...next, { role: "assistant", content: res.content }]);
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      <div className="h-full w-full max-w-md bg-neutral-950 border-l border-neutral-800 flex flex-col">
        <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-4">
          <div className="font-medium">Birmingham Assistant</div>
          <button
            aria-label="Close assistant"
            onClick={onClose}
            className="rounded-lg bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-sm"
          >
            Close
          </button>
        </div>
        <div ref={viewRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.map((m, i) => (
            <Message key={i} role={m.role} content={m.content} />
          ))}
          {busy && <div className="text-sm opacity-70">Thinking…</div>}
        </div>
        <form
          onSubmit={send}
          className="p-3 border-t border-neutral-800 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about jobs, pay, posting…"
            className="flex-1 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

function Message({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={`max-w-[85%] ${isUser ? "ml-auto" : ""}`}>
      <div
        className={`rounded-2xl px-3 py-2 text-sm border ${isUser ? "bg-neutral-800 border-neutral-700" : "bg-neutral-900 border-neutral-800"}`}
      >
        <span className="whitespace-pre-wrap">{content}</span>
      </div>
    </div>
  );
}
