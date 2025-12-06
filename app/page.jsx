"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePublicChatApi } from '../src/hooks/usePublicChatApi.js';
import { useTranscribe } from '../src/hooks/useTranscribe.js';
import { useSpeechSynthesis } from '../src/hooks/useSpeechSynthesis.js';

const DEFAULT_MESSAGES = [{ role: 'assistant', content: 'Hi! How can I help with your job search today?' }];

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
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const queueRef = useRef([]);
  const messagesRef = useRef(DEFAULT_MESSAGES);
  const taRef = useRef(null);
  const mediaRef = useRef({ stream: null, recorder: null, chunks: [] });
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const assistantCountRef = useRef(DEFAULT_MESSAGES.filter((m) => m.role === 'assistant').length);

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
  const lastAssistant = useMemo(() => {
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

  async function onSend(e) {
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
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setPending(true);
    try {
      const res = await chat(next);
      const ai = { role: 'assistant', content: res?.content || '...' };
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
      const chunks = [];
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

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      onSend(e);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Conversation */}
      <div className="flex-1 space-y-6" role="log" aria-live="polite" aria-relevant="additions" aria-label="Chat messages">
        {messages.map((m, idx) => {
          const isUser = m.role === 'user';
          return (
            <div key={idx} className={`flex gap-3 items-start ${isUser ? 'justify-end' : ''}`}>
              {!isUser && (
                <div className="size-9 rounded-full bg-muted/20 flex items-center justify-center text-muted">A</div>
              )}
              <div
                className={
                  'max-w-[80%] px-4 py-3 shadow-sm leading-relaxed ' +
                  (isUser
                    ? 'rounded-2xl rounded-tr-md bg-primary text-white'
                    : 'rounded-2xl rounded-tl-md bg-surface border border-border')
                }
              >
                {m.content}
              </div>
              {isUser && (
                <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center text-primary">U</div>
              )}
            </div>
          );
        })}

        {pending && (
          <div className="flex gap-3 items-start">
            <div className="size-9 rounded-full bg-muted/20 flex items-center justify-center text-muted">A</div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-surface border border-border px-4 py-3 shadow-sm">
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="mt-6">
        <form className="rounded-xl bg-white/80 border border-border shadow-sm p-2 flex items-end gap-2" onSubmit={onSend} aria-label="Message composer">
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
            className={`rounded-lg px-3 py-2 border transition ${voiceEnabled ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-slate-50 border-border text-slate-700'} disabled:opacity-50`}
          >
            {voiceEnabled ? '🔊' : '🔈'}
          </button>
          <button
            type="button"
            aria-label={recording ? 'Stop recording' : 'Start voice input'}
            disabled={offline || pending || transcribing}
            onClick={toggleRecord}
            aria-pressed={recording}
            className={`rounded-lg px-3 py-2 border transition ${recording ? 'bg-rose-600 text-white border-rose-600' : 'bg-white hover:bg-slate-50 border-border text-slate-700'} disabled:opacity-50`}
          >
            {recording ? 'Stop' : '🎤'}
          </button>
          <textarea
            ref={taRef}
            id="composer-input"
            placeholder="Send a message..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Message input"
            className="flex-1 resize-none bg-transparent outline-none px-3 py-2 rounded-lg placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg bg-primary text-white px-4 py-2 hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {pending ? 'Sending…' : 'Send'}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-muted">
          Press Enter to send • Shift+Enter for newline
          {recording && <span className="ml-2 text-rose-700">Recording…</span>}
          {transcribing && <span className="ml-2 text-slate-700">Transcribing…</span>}
          {voiceSupported ? (
            voiceEnabled ? (
              isSpeaking && <span className="ml-2 text-emerald-700">Speaking…</span>
            ) : (
              <span className="ml-2">Voice playback off</span>
            )
          ) : (
            <span className="ml-2 text-amber-700">Voice playback unsupported</span>
          )}
        </p>
        {voiceSupported && lastAssistant?.content && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => speak(lastAssistant.content)}
              disabled={!voiceEnabled}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {voiceEnabled ? 'Replay last response' : 'Enable voice playback to replay'}
            </button>
          </div>
        )}
        {/* Connectivity banner */}
        {offline && (
          <div className="mt-2 text-xs rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2">
            You’re offline. We’ll hold your message and send it when you’re back online.
          </div>
        )}
        {reconnected && (
          <div className="mt-2 text-xs rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2">
            Reconnected. Sending pending messages…
          </div>
        )}
      </div>
    </div>
  );
}

// Connectivity effects
export function ConnectivityEffects() {
  return null;
}
