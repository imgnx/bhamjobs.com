Scope: Entire repository

This file guides agents contributing to this codebase. Follow these conventions and notes when making changes.

Project
- Framework: Next.js (App Router). Run locally with `next dev --turbo` (Turbopack). Prod with `next start` behind a proxy.
- Styling: TailwindCSS v4 via CSS import only. Global styles live in `app/globals.css`. Do not add PostCSS or other build tools.
- UI: Radix UI is available for interactive primitives.
- API: Route handlers under `app/api/*`. Do not introduce a separate server.
- Database: PostgreSQL via `pg` using parameterized SQL. Migrations in `sql/`, runnable via `scripts/migrate.lisp` (SBCL).
- Security: Private API routes must check `Authorization: Bearer ${API_TOKEN}`. Public routes should cap input sizes and keep outputs short.
- Environment: Required variables are documented in `.env.example`. Client-exposed values must be `NEXT_PUBLIC_*`.

Style & Process
- Keep changes minimal, focused, and composable. Avoid global side effects.
- Prefer small, local utilities in CSS over new dependencies.
- Do not add license headers.

Recent changes (Chat UI)
- Added a minimal chat-room layout resembling ChatGPT: sidebar, scrollable chat pane, and sticky composer.
  - File: `app/layout.jsx` — two-column shell with sticky header/footer.
  - File: `app/page.jsx` — renders messages and composer; wired to public chat API.
- Global polish in `app/globals.css`: subtle rounding, soft gradients, smooth transitions, and accessible focus ring.

Public chat integration
- Hook: `src/hooks/usePublicChatApi.js` used for sending messages to `app/api/openai/public-chat/route.js`.
- `app/page.jsx` maintains `messages`, `input`, and `pending` state. Enter sends; Shift+Enter adds newline.
- Pending state shows a temporary assistant bubble ("Thinking…"). Errors surface a short assistant apology.

Testing
- Start dev: `npm run dev` or `yarn dev` (uses Turbopack) then visit `/`.
- Exercise public chat via curl:
  - `curl -s -X POST http://localhost:3000/api/openai/public-chat -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"hello"}]}'`

Next steps (optional)
- Replace placeholder sidebar items with real session history.
- Add mobile sidebar toggle.
- If private routes are used, ensure `Authorization: Bearer ${API_TOKEN}` header is included.
Connectivity and service worker
- Added a minimal service worker at `public/sw.js` that does not cache requests; it only enables connectivity pings.
- Registered the service worker in `app/layout.jsx` via an inline script after page load.
- `app/page.jsx` now:
  - Detects `navigator.onLine` and provides user feedback banners when offline/after reconnect.
  - Queues messages typed while offline and sends them after the connection returns.
  - Avoids caching or storing chat responses; only transient in-memory queue is used.

Persistence and static asset caching (new)
- Messages persist to `localStorage` under `chat_messages`; queued offline drafts persist under `chat_queue`.
- Service worker now caches a minimal app shell and static assets with a cache-first strategy, while keeping `navigate` requests network-first and excluding `/api/` routes.
- Cache name: `app-shell-v1`. Update list in `public/sw.js` if you add important shell files.

Command Palette and Status Bar (new)
- Command Palette component at `src/components/CommandPalette.jsx`. Open with `Cmd/Ctrl+Enter`. Searches commands by title, subtitle, keywords. Enter runs; Esc closes.
- Global hotkey hook `src/hooks/useCommandPaletteHotkey.js`.
- Integrated in `app/layout.jsx` with a `commands` array. Treat route navigations as commands (`href`). Inline actions use `action` functions.
- Status Bar at `src/components/StatusBar.jsx`, mounted in `app/layout.jsx`. Accepts `cells` prop: small plugin cells shown at the bottom (e.g., command hint, connectivity, build).
- Plugin pattern: a plugin may provide `{ commands: [], cells: [] }` which can be composed into the layout wiring.

Authoring guidelines for plugins
- Keep commands short; prefer descriptive `title` and a concise `subtitle`.
- Cap command execution time; avoid network unless necessary and keep outputs short.
- Do not store PII in localStorage; if you must persist data, use `chat_messages`/`chat_queue` style and document clearly.
