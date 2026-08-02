"use client";

import type { FormEvent, KeyboardEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePublicChatApi } from '../src/hooks/usePublicChatApi.js';
import { useTranscribe } from '../src/hooks/useTranscribe.js';
import { useSpeechSynthesis } from '../src/hooks/useSpeechSynthesis.js';

type ChatMessage = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

type Job = {
  id: number | string;
  title: string;
  company: string;
  location: string;
  pay: string;
  type: string;
  schedule: string;
  tags: string[];
  posted: string;
  match: number;
  description?: string;
  contactEmail?: string;
  source?: 'featured' | 'employer';
  signal?: string;
  commute?: string;
  applicants?: string;
  urgency?: 'hot' | 'steady' | 'new';
};

type JobForm = {
  title: string;
  company: string;
  location: string;
  pay: string;
  type: string;
  schedule: string;
  tags: string;
  contactEmail: string;
  description: string;
};

type SendEvent =
  | FormEvent<HTMLFormElement>
  | MouseEvent<HTMLButtonElement>
  | KeyboardEvent<HTMLTextAreaElement>
  | undefined;

const DEFAULT_MESSAGES: ChatMessage[] = [{ role: 'assistant', content: 'Hi! How can I help with your job search today?' }];
const POSTED_JOBS_STORAGE_KEY = 'bhamjobs_posted_jobs';
const EMPTY_JOB_FORM: JobForm = {
  title: '',
  company: '',
  location: 'Birmingham, AL',
  pay: '',
  type: 'Full-time',
  schedule: 'Day shift',
  tags: '',
  contactEmail: '',
  description: '',
};

const FEATURED_JOBS: Job[] = [
  {
    id: 1,
    title: 'Maintenance Technician II',
    company: 'Birmingham Industrial Supply',
    location: 'Bessemer, AL',
    pay: '$27-34/hr',
    type: 'Full-time',
    schedule: 'Day shift',
    tags: ['Industrial', 'PLC', 'Benefits'],
    posted: 'Today',
    match: 96,
    source: 'featured',
    signal: 'Plant expansion',
    commute: '18 min avg commute',
    applicants: '12 early applicants',
    urgency: 'hot',
  },
  {
    id: 2,
    title: 'Patient Access Coordinator',
    company: 'UAB Medicine',
    location: 'Birmingham, AL',
    pay: '$19-25/hr',
    type: 'Full-time',
    schedule: 'Hybrid',
    tags: ['Healthcare', 'Entry friendly', 'UAB'],
    posted: '1d ago',
    match: 92,
    source: 'featured',
    signal: 'Weekend differential',
    commute: 'Hybrid intake team',
    applicants: '24 profile views',
    urgency: 'new',
  },
  {
    id: 3,
    title: 'CDL Class A Local Driver',
    company: 'Magic City Logistics',
    location: 'Homewood, AL',
    pay: '$72-84k',
    type: 'Full-time',
    schedule: 'Local routes',
    tags: ['CDL', 'No overnight', 'Weekly pay'],
    posted: '2d ago',
    match: 89,
    source: 'featured',
    signal: 'Home nightly',
    commute: 'I-65 corridor',
    applicants: '7 saves today',
    urgency: 'steady',
  },
  {
    id: 4,
    title: 'Junior React Developer',
    company: 'Vulcan Digital Works',
    location: 'Downtown Birmingham',
    pay: '$68-82k',
    type: 'Full-time',
    schedule: 'Hybrid',
    tags: ['Technology', 'React', 'Growth'],
    posted: '3d ago',
    match: 87,
    source: 'featured',
    signal: 'Portfolio friendly',
    commute: '2 office days',
    applicants: '31 developer matches',
    urgency: 'new',
  },
];

const QUICK_FILTERS = ['Healthcare', 'Manufacturing', 'Skilled Trades', 'Remote', 'Entry Level', 'Hiring Today'];
const MARKET_SIGNALS = [
  { value: '214', label: 'new leads', note: '+17 since breakfast' },
  { value: '41m', label: 'median reply', note: 'fastest in healthcare' },
  { value: '73', label: 'shift roles', note: 'posted after 5pm' },
  { value: '18', label: 'urgent hires', note: 'interviews this week' },
];
const TALENT_PULSES = [
  'Hospitals are moving fastest on patient access and night-shift support.',
  'Warehouse and CDL teams are responding best to weekly-pay language.',
  'Hybrid admin roles are getting more saves than fully remote listings today.',
  'Manufacturing postings with PLC or maintenance tags are drawing senior candidates.',
];
const ASSISTANT_PROMPTS = [
  'Find jobs that pay $25/hr or more',
  'Show entry-level healthcare roles',
  'Which jobs can interview this week?',
  'Help rewrite my resume for logistics',
];
const URGENCY_STYLES: Record<NonNullable<Job['urgency']>, string> = {
  hot: 'border-rose-200 bg-rose-50 text-rose-700',
  steady: 'border-sky-200 bg-sky-50 text-sky-700',
  new: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function Page() {
  const { chat } = usePublicChatApi({});
  const { transcribeBlob } = useTranscribe({});
  const {
    speak,
    cancel: cancelSpeech,
    enabled: voiceEnabled,
    toggleEnabled: toggleVoiceEnabled,
    supported: voiceSupported,
    isSpeaking,
  } = useSpeechSynthesis({ preferLocale: 'en' });
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState<string>('');
  const [pending, setPending] = useState<boolean>(false);
  const [offline, setOffline] = useState<boolean>(false);
  const [reconnected, setReconnected] = useState<boolean>(false);
  const queueRef = useRef<string[]>([]);
  const messagesRef = useRef<ChatMessage[]>(DEFAULT_MESSAGES);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRef = useRef<{ stream: MediaStream | null; recorder: MediaRecorder | null; chunks: Blob[] }>({
    stream: null,
    recorder: null,
    chunks: [],
  });
  const [recording, setRecording] = useState<boolean>(false);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Hiring Today');
  const [postedJobs, setPostedJobs] = useState<Job[]>([]);
  const [postJobOpen, setPostJobOpen] = useState<boolean>(false);
  const [jobForm, setJobForm] = useState<JobForm>(EMPTY_JOB_FORM);
  const [jobFormError, setJobFormError] = useState<string>('');
  const [postedJobId, setPostedJobId] = useState<string | number | null>(null);
  const [entropyTick, setEntropyTick] = useState<number>(0);
  const assistantCountRef = useRef<number>(DEFAULT_MESSAGES.filter((m) => m.role === 'assistant').length);
  const allJobs = useMemo<Job[]>(() => [...postedJobs, ...FEATURED_JOBS], [postedJobs]);

  const filteredJobs = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return allJobs.filter((job) => {
      const haystack = `${job.title} ${job.company} ${job.location} ${job.type} ${job.schedule} ${job.tags.join(' ')} ${job.description || ''}`.toLowerCase();
      const matchesTerm = !term || haystack.includes(term);
      const matchesFilter =
        selectedFilter === 'Hiring Today'
          ? job.posted === 'Today' || job.posted === '1d ago'
          : selectedFilter === 'Remote'
            ? job.schedule.toLowerCase().includes('hybrid')
            : selectedFilter === 'Entry Level'
              ? job.tags.some((tag) => tag.toLowerCase().includes('entry'))
              : haystack.includes(selectedFilter.toLowerCase());
      return matchesTerm && matchesFilter;
    });
  }, [allJobs, keyword, selectedFilter]);

  const displayedJobs = filteredJobs.length ? filteredJobs : allJobs;
  const currentSignal = MARKET_SIGNALS[entropyTick % MARKET_SIGNALS.length];
  const currentPulse = TALENT_PULSES[entropyTick % TALENT_PULSES.length];
  const promptOffset = entropyTick % ASSISTANT_PROMPTS.length;
  const rotatedPrompts = useMemo(
    () => [...ASSISTANT_PROMPTS.slice(promptOffset), ...ASSISTANT_PROMPTS.slice(0, promptOffset)],
    [promptOffset],
  );

  useEffect(() => {
    const id = window.setInterval(() => setEntropyTick((tick) => tick + 1), 9000);
    return () => window.clearInterval(id);
  }, []);

  // Load messages from storage after mount to avoid hydration mismatches
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('chat_messages');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        setMessages(parsed);
        messagesRef.current = parsed;
        assistantCountRef.current = parsed.filter((m) => m.role === 'assistant').length;
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(POSTED_JOBS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPostedJobs(parsed.filter(isStoredJob));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(POSTED_JOBS_STORAGE_KEY, JSON.stringify(postedJobs));
    } catch {}
  }, [postedJobs]);

  useEffect(() => {
    function openPostJob() {
      setPostJobOpen(true);
      setJobFormError('');
    }
    window.addEventListener('jobs:open-post-form', openPostJob);
    return () => window.removeEventListener('jobs:open-post-form', openPostJob);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash !== '#post-job') return;
    setPostJobOpen(true);
    setJobFormError('');
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Load queued drafts from storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('chat_queue');
      if (raw) queueRef.current = JSON.parse(raw);
    } catch {}
  }, []);
  // Persist messages
  useEffect(() => {
    try { localStorage.setItem('chat_messages', JSON.stringify(messages)); } catch {}
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Online/offline listeners and SW heartbeat
  useEffect(() => {
    async function handleOnline() {
      setOffline(false);
      setReconnected(true);
      const queued = [...queueRef.current];
      queueRef.current = [];
      try { localStorage.setItem('chat_queue', JSON.stringify(queueRef.current)); } catch {}
      for (const text of queued) {
        setMessages((m) => [...m, { role: 'user', content: text }]);
      }
      if (queued.length) {
        try {
          setPending(true);
          const baseMessages = [...messagesRef.current, ...queued.map(q => ({ role: 'user', content: q }))];
          const res = await chat(baseMessages);
          setMessages((m) => [...m, { role: 'assistant', content: res?.content || '...' }]);
        } catch (err) {
          setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, there was an error after reconnecting.' }]);
        } finally {
          setPending(false);
        }
      }
      setTimeout(() => setReconnected(false), 2000);
    }
    function handleOffline() {
      setOffline(true);
    }
    setOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Ping SW if present
    navigator.serviceWorker?.controller?.postMessage?.({ type: 'PING' });
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [chat]);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);
  const lastAssistant = useMemo<ChatMessage | null>(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'assistant') return messages[i];
    }
    return null;
  }, [messages]);

  // Command palette integration: toggle recording
  useEffect(() => {
    function onToggle() {
      if (!offline && !pending && !transcribing) toggleRecord().catch(()=>{});
    }
    window.addEventListener('voice:toggle', onToggle);
    return () => window.removeEventListener('voice:toggle', onToggle);
  }, [offline, pending, transcribing]);

  useEffect(() => {
    const assistants = messages.filter((m) => m.role === 'assistant');
    const count = assistants.length;
    const prev = assistantCountRef.current;
    assistantCountRef.current = count;
    if (!voiceSupported || !voiceEnabled) return;
    if (count <= prev) return;
    const latest = assistants[assistants.length - 1];
    if (latest?.content) speak(latest.content);
  }, [messages, voiceEnabled, voiceSupported, speak]);

  useEffect(() => {
    if (!voiceEnabled) cancelSpeech();
  }, [voiceEnabled, cancelSpeech]);

  useEffect(() => {
    function onPlaybackToggle() {
      if (!voiceSupported) {
        alert('Voice playback is not supported in this browser.');
        return;
      }
      toggleVoiceEnabled();
    }
    window.addEventListener('voice:playback-toggle', onPlaybackToggle);
    return () => window.removeEventListener('voice:playback-toggle', onPlaybackToggle);
  }, [voiceSupported, toggleVoiceEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('voice:playback-changed', { detail: { enabled: voiceEnabled, supported: voiceSupported } }));
  }, [voiceEnabled, voiceSupported]);

  async function onSend(e: SendEvent) {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text) return;
    if (offline) {
      // Queue locally and inform user
      queueRef.current.push(text);
      setInput('');
      setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: 'You are offline. I will send this when you reconnect.' }]);
      try { localStorage.setItem('chat_queue', JSON.stringify(queueRef.current)); } catch {}
      return;
    }
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setPending(true);
    try {
      const res = await chat(next);
      const ai: ChatMessage = { role: 'assistant', content: res?.content || '...' };
      setMessages((m) => [...m, ai]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, there was an error reaching the assistant.' }]);
      console.error(err);
    } finally {
      setPending(false);
      // re-focus input
      taRef.current?.focus();
    }
  }

  async function toggleRecord() {
    if (recording) {
      try { mediaRef.current.recorder?.stop(); } catch {}
      return;
    }
    if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      alert('Voice recording not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRef.current = { stream, recorder: rec, chunks };
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        setRecording(false);
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setTranscribing(true);
        try {
          const text = await transcribeBlob(blob);
          if (text) setInput((v) => (v ? v + ' ' + text : text));
        } catch (e) {
          console.error(e);
          alert('Transcription failed. Ensure faster-whisper is installed on the server.');
        } finally {
          setTranscribing(false);
          taRef.current?.focus();
        }
      };
      rec.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      alert('Microphone permission denied or unavailable.');
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      onSend(e);
    }
  }

  function updateJobForm(field: keyof JobForm, value: string) {
    setJobForm((form) => ({ ...form, [field]: value }));
    if (jobFormError) setJobFormError('');
  }

  function submitJobPost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const requiredFields: Array<keyof JobForm> = ['title', 'company', 'location', 'pay', 'contactEmail', 'description'];
    const missing = requiredFields.find((field) => !jobForm[field].trim());
    if (missing) {
      setJobFormError('Complete the required fields before publishing the role.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jobForm.contactEmail.trim())) {
      setJobFormError('Enter a valid contact email for applicants.');
      return;
    }

    const tags = jobForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 6);
    const newJob: Job = {
      id: `employer-${Date.now()}`,
      title: jobForm.title.trim(),
      company: jobForm.company.trim(),
      location: jobForm.location.trim(),
      pay: jobForm.pay.trim(),
      type: jobForm.type.trim() || 'Full-time',
      schedule: jobForm.schedule.trim() || 'Day shift',
      tags: tags.length ? tags : ['Employer posted'],
      posted: 'Today',
      match: 99,
      description: jobForm.description.trim(),
      contactEmail: jobForm.contactEmail.trim(),
      source: 'employer',
    };

    setPostedJobs((jobs) => [newJob, ...jobs]);
    setPostedJobId(newJob.id);
    setSelectedFilter('Hiring Today');
    setKeyword('');
    setJobForm(EMPTY_JOB_FORM);
    setJobFormError('');
    setPostJobOpen(false);
    setMessages((items) => [
      ...items,
      {
        role: 'assistant',
        content: `Your role "${newJob.title}" at ${newJob.company} is live in the Birmingham job desk.`,
      },
    ]);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.5fr_0.8fr]">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Birmingham workforce network</span>
              <span>4,218 active openings</span>
            </div>
            <div className="mt-5 max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
                Birmingham hiring, organized by people who know the market.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Search verified roles across healthcare, logistics, trades, manufacturing, hospitality, and technology in the metro area.
              </p>
            </div>
            <form className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_180px_140px]" onSubmit={(e) => e.preventDefault()}>
              <label className="sr-only" htmlFor="job-search">Search jobs</label>
              <input
                id="job-search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Job title, company, skill, or keyword"
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <label className="sr-only" htmlFor="job-area">Area</label>
              <select
                id="job-area"
                className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                defaultValue="Metro Birmingham"
              >
                <option>Metro Birmingham</option>
                <option>Downtown</option>
                <option>Homewood</option>
                <option>Bessemer</option>
                <option>Hoover</option>
              </select>
              <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                Search
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    selectedFilter === filter
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            {postedJobId && (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Job posted. It is now listed at the top of Recommended openings.
              </div>
            )}
          </div>
          <div className="border-t border-slate-200 bg-slate-950 p-5 text-white lg:border-l lg:border-t-0 sm:p-7">
            <div className="text-sm font-medium text-emerald-300">Live supply desk</div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {[
                [currentSignal.value, currentSignal.label, currentSignal.note],
                ['612', 'verified employers', 'screened by category'],
                ['91%', 'local fill rate', '30-day employer report'],
                ['7', 'active sectors', 'updated every shift'],
              ].map(([value, label, note]) => (
                <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="text-3xl font-semibold">{value}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{label}</div>
                  <div className="mt-2 text-xs text-slate-300">{note}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                Market pulse
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200">{currentPulse}</p>
            </div>
            <div className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4">
              <div className="text-sm font-semibold">Priority sectors this week</div>
              <div className="mt-3 space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between"><span>Healthcare</span><span className="font-semibold text-white">1,024 roles</span></div>
                <div className="flex items-center justify-between"><span>Skilled trades</span><span className="font-semibold text-white">694 roles</span></div>
                <div className="flex items-center justify-between"><span>Logistics</span><span className="font-semibold text-white">438 roles</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recommended openings</h2>
              <p className="text-sm text-slate-500">{filteredJobs.length} roles matching your current view</p>
            </div>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Create alert</button>
          </div>
          <div className="divide-y divide-slate-200">
            {displayedJobs.map((job) => (
              <article
                key={job.id}
                className={`grid gap-4 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_auto] ${
                  job.id === postedJobId ? 'bg-emerald-50/60' : ''
                }`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-950">{job.title}</h3>
                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{job.posted}</span>
                    {job.source === 'employer' && (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">Employer posted</span>
                    )}
                    {job.urgency && (
                      <span className={`rounded border px-2 py-1 text-xs font-medium ${URGENCY_STYLES[job.urgency]}`}>
                        {job.urgency === 'hot' ? 'Hot lead' : job.urgency === 'new' ? 'Fresh signal' : 'Steady interest'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{job.company} · {job.location}</p>
                  {job.description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{job.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[job.pay, job.type, job.schedule, ...job.tags].map((item) => (
                      <span key={item} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">{item}</span>
                    ))}
                  </div>
                  {job.contactEmail && (
                    <a className="mt-3 inline-block text-sm font-medium text-emerald-700 underline decoration-emerald-200 underline-offset-4" href={`mailto:${job.contactEmail}`}>
                      Contact employer
                    </a>
                  )}
                  {(job.signal || job.commute || job.applicants) && (
                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
                      {[job.signal, job.commute, job.applicants].filter(Boolean).map((item) => (
                        <div key={item} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex min-w-36 items-center gap-3 md:flex-col md:items-end">
                  <div className="text-sm font-semibold text-emerald-700">{job.match}% match</div>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Save</button>
                    <button className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Apply</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Birmingham assistant</h2>
              <p className="text-sm text-slate-500">Ask about pay, fit, resumes, or where to apply next.</p>
            </div>
            <div className="max-h-[420px] space-y-4 overflow-y-auto px-5 py-4" role="log" aria-live="polite" aria-relevant="additions" aria-label="Chat messages">
              {messages.map((m, idx) => {
                const isUser = m.role === 'user';
                return (
                  <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
                    {!isUser && <div className="grid size-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-xs font-semibold text-emerald-700">BJ</div>}
                    <div className={`max-w-[84%] rounded-lg px-3 py-2 text-sm leading-6 ${isUser ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-slate-50 text-slate-700'}`}>
                      {m.content}
                    </div>
                  </div>
                );
              })}
              {pending && (
                <div className="flex gap-3">
                  <div className="grid size-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-xs font-semibold text-emerald-700">BJ</div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">Checking the Birmingham market...</div>
                </div>
              )}
            </div>
            <div className="border-t border-slate-200 p-3">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {rotatedPrompts.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInput(prompt);
                      taRef.current?.focus();
                    }}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2" onSubmit={onSend} aria-label="Message composer">
                <button
                  type="button"
                  aria-label={voiceEnabled ? 'Disable voice playback' : 'Enable voice playback'}
                  aria-pressed={voiceEnabled}
                  disabled={!voiceSupported}
                  onClick={() => {
                    if (!voiceSupported) {
                      alert('Voice playback is not supported in this browser.');
                      return;
                    }
                    toggleVoiceEnabled();
                  }}
                  className={`min-h-10 rounded-md border px-3 text-sm font-medium ${voiceEnabled ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} disabled:opacity-50`}
                >
                  Voice
                </button>
                <button
                  type="button"
                  aria-label={recording ? 'Stop recording' : 'Start voice input'}
                  disabled={offline || pending || transcribing}
                  onClick={toggleRecord}
                  aria-pressed={recording}
                  className={`min-h-10 rounded-md border px-3 text-sm font-medium ${recording ? 'border-rose-700 bg-rose-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} disabled:opacity-50`}
                >
                  {recording ? 'Stop' : 'Mic'}
                </button>
                <textarea
                  ref={taRef}
                  id="composer-input"
                  placeholder="Ask about a role, employer, or pay range"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  aria-label="Message input"
                  className="min-h-10 flex-1 resize-none rounded-md bg-white px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400"
                />
                <button type="submit" disabled={!canSend} className="min-h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {pending ? 'Sending' : 'Send'}
                </button>
              </form>
              <div className="mt-2 min-h-5 text-center text-xs text-slate-500">
                {recording && <span className="text-rose-700">Recording...</span>}
                {transcribing && <span className="text-slate-700">Transcribing...</span>}
                {voiceSupported && voiceEnabled && isSpeaking && <span className="text-emerald-700">Speaking...</span>}
                {voiceSupported && lastAssistant?.content && (
                  <button type="button" onClick={() => speak(lastAssistant.content)} disabled={!voiceEnabled} className="ml-2 underline decoration-slate-300 underline-offset-4 disabled:opacity-40">
                    Replay last response
                  </button>
                )}
              </div>
              {offline && <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">You're offline. Messages will send when you're back online.</div>}
              {reconnected && <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Reconnected. Sending pending messages...</div>}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Employer services</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-start justify-between gap-4"><span>Screened local candidate pool</span><span className="font-semibold text-slate-950">18k+</span></div>
              <div className="flex items-start justify-between gap-4"><span>Same-day sponsored posting review</span><span className="font-semibold text-slate-950">Available</span></div>
              <div className="flex items-start justify-between gap-4"><span>Sector-specific hiring support</span><span className="font-semibold text-slate-950">7 teams</span></div>
            </div>
            <button
              type="button"
              onClick={() => setPostJobOpen(true)}
              className="mt-5 w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Post a role
            </button>
          </section>
        </aside>
      </div>
      {postJobOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="post-job-title">
          <div className="max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="post-job-title" className="text-lg font-semibold text-slate-950">Post a Birmingham job</h2>
                <p className="mt-1 text-sm text-slate-500">Publish a role to the job desk for local candidates.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPostJobOpen(false);
                  setJobFormError('');
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <form className="grid gap-4 p-5" onSubmit={submitJobPost}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Job title
                  <input value={jobForm.title} onChange={(e) => updateJobForm('title', e.target.value)} required className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Company
                  <input value={jobForm.company} onChange={(e) => updateJobForm('company', e.target.value)} required className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Location
                  <input value={jobForm.location} onChange={(e) => updateJobForm('location', e.target.value)} required className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Pay range
                  <input value={jobForm.pay} onChange={(e) => updateJobForm('pay', e.target.value)} placeholder="$22-30/hr or $70-85k" required className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Type
                  <select value={jobForm.type} onChange={(e) => updateJobForm('type', e.target.value)} className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100">
                    <option>Full-time</option>
                    <option>Part-time</option>
                    <option>Contract</option>
                    <option>Temporary</option>
                    <option>Internship</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Schedule
                  <input value={jobForm.schedule} onChange={(e) => updateJobForm('schedule', e.target.value)} className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
                </label>
              </div>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Tags
                <input value={jobForm.tags} onChange={(e) => updateJobForm('tags', e.target.value)} placeholder="Healthcare, Entry friendly, Benefits" className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Applicant contact email
                <input type="email" value={jobForm.contactEmail} onChange={(e) => updateJobForm('contactEmail', e.target.value)} required className="min-h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Role summary
                <textarea value={jobForm.description} onChange={(e) => updateJobForm('description', e.target.value)} required rows={5} className="rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" />
              </label>
              {jobFormError && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{jobFormError}</div>}
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => setPostJobOpen(false)} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                  Publish job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function isStoredJob(value: unknown): value is Job {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<Job>;
  return (
    typeof job.id !== 'undefined' &&
    typeof job.title === 'string' &&
    typeof job.company === 'string' &&
    typeof job.location === 'string' &&
    typeof job.pay === 'string' &&
    typeof job.type === 'string' &&
    typeof job.schedule === 'string' &&
    Array.isArray(job.tags) &&
    typeof job.posted === 'string' &&
    typeof job.match === 'number'
  );
}
