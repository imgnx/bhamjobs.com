# bhamjobs — Next.js app with consumer/full chat, PostgreSQL, Tailwind v4, Radix UI, and Lisp migrations

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-336791?logo=postgresql&logoColor=white)
![npm](https://img.shields.io/badge/npm-10%2B-cb3837?logo=npm&logoColor=white)

Overview
- Next.js (App Router) frontend and API routes (no Vercel required)
- TailwindCSS v4 via global CSS import (no PostCSS)
- Radix UI components installed (Dialog, Dropdown, Icons)
- OpenAI proxy routes for consumer and full chat tiers
- Community boards (forum, bulletin, feature requests) backed by Prisma + PostgreSQL
- Express server present for optional local security/DB checks
- PostgreSQL with SQL schema and a Common Lisp migration runner

Quick start _(see "Local dev database" below for the Docker option)_
- Requirements: Node 18+, npm 10+, PostgreSQL 13+, SBCL (for Lisp runner), psql on PATH
- Install deps: `npm install`
- Copy env + set secrets: `npm run prepare:env`, then set `API_TOKEN`, `NEXT_PUBLIC_API_TOKEN`, `OPENAI_API_KEY`, and DB creds in `.env`
- Init database schema: `npm run db:init` (runs `sql/init.sql` against `DATABASE_URL` or `PG*` vars)
- Generate Prisma client after editing the schema: `npx prisma generate`
- Start dev server: `npm run dev` → http://localhost:3000

Local dev database (Docker)
- Requires Docker Desktop/engine. Defaults match `.env.example` (`admin` / `secret`, db `bhamjobs`, port `5432`).
- Start Postgres: `npm run db:docker:up` (data lives in `.data/postgres`, schema bootstraps from `sql/init.sql` on first launch).
- Tail the database logs: `npm run db:docker:logs`
- Stop and remove the container: `npm run db:docker:down`
- If port 5432 is busy, change the port mapping in `docker-compose.dev.yml` and update `DATABASE_URL` / `PGPORT` in `.env`.

Dev server (Turbopack)
- `npm run dev` runs `next dev` (Turbopack by default on Next 16).

Testing
- Run `npm test` to execute the lightweight Node-based suite (currently covering discussion utilities).

Payments (Stripe)
- Set in `.env` (see `.env.example`): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, optionally `NEXT_PUBLIC_BASE_URL`.
- Create a Price in Stripe and note its `price_...` id. For quick UI testing, set `NEXT_PUBLIC_STRIPE_TEST_PRICE_ID` in `.env`.
- Private route: `POST /api/payments/create-checkout-session`
  - Headers: `Authorization: Bearer ${API_TOKEN}`
  - Body: `{ "priceId": "price_...", "quantity": 1 }` (optionally pass `payment_method_types` to override defaults).
  - Returns: `{ id, url }` (redirect users to `url`).
  - Checkout defaults to `['card', 'link']` so customers can pay with Link by Stripe; override by providing your own `payment_method_types`.
- Webhook: `POST /api/payments/webhook` (configure endpoint in Stripe and set `STRIPE_WEBHOOK_SECRET`).
- UI: Visit `/payments` in dev to trigger a checkout.

Example curl:
```
curl -X POST http://localhost:3000/api/payments/create-checkout-session \
  -H "authorization: Bearer $API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"priceId":"price_123","quantity":1}'
```

Consumer vs full chat
- Consumer (no login): POST `/api/openai/public-chat` — limited length, safer prompt, lower rate expectations.
  - In UI: From the login screen, "Open Assistant (limited)".
- Full (requires token): POST `/api/openai/chat` — must send `Authorization: Bearer ${API_TOKEN}`.
  - In UI: After login (mock local token), FAB opens the assistant drawer.

API endpoints (Next.js)
- POST `/api/openai/public-chat`
  - Body: `{ messages: [{ role: 'user'|'assistant'|'system', content: string }] }`
  - Returns: `{ content, tier: 'consumer' }`
- POST `/api/openai/chat`
  - Headers: `Authorization: Bearer ${API_TOKEN}`
  - Body: `{ messages: [...] }`
  - Returns: `{ content }`

Server routes
- All API endpoints are implemented in Next.js under `app/api/*`. There is no separate Express server.

- Database
- Schema: `sql/init.sql` defines `app_log`, `forum_board`, `discussion_thread`, and `discussion_post` tables.
- ORM: Prisma schema lives at `prisma/schema.prisma`; reuse the singleton client exported from `src/lib/prisma.js` inside Next.js route handlers.
- Connection: Prisma (and legacy `pg` scripts) use `DATABASE_URL` or the discrete `PG*` env vars.
- Local dev DB: `npm run db:docker:up` starts a Postgres 16 container with the `.env.example` defaults; data persists in `.data/postgres`.
- Generate client: `npx prisma generate` (after installing deps / updating schema).
- Apply schema updates: use Prisma migrations (`npx prisma migrate dev --name board-init`) or `npx prisma db push` for quick sync; `npm run db:migrate:lisp` remains available for SQL-first environments.
- Migrations:
  - Common Lisp runner (SBCL): `scripts/migrate.lisp`
  - Run: `npm run db:migrate:lisp` (defaults to `sql/init.sql`, or pass a path when invoking sbcl directly)

Styling
- Tailwind v4 without PostCSS
  - Global import at `app/globals.css`: `@import "tailwindcss";`
  - Included by `app/layout.tsx`.

UI Library
- Radix UI installed: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-icons`
- Example component: `src/components/RadixDemo.jsx`

Command Palette & Status Bar
- Open the Command Palette with `Cmd+Enter` (macOS) or `Ctrl+Enter` (Windows/Linux).
- Search to run commands: route navigations and inline actions.
- Status Bar at the bottom shows pluggable cells (connectivity, build info, palette hint).

VS Code tasks
- If you keep editor tasks, wire them to `npm run dev`, `npm run build`, `npm test`, and Prisma commands.

Included commands
- Go: Home — navigate to `/`
- Go: Payments — navigate to `/payments`
- Go: Payment Success — navigate to `/payments/success`
- Go: Payment Canceled — navigate to `/payments/cancel`
- Action: Create Checkout Session — calls `/api/payments/create-checkout-session`
- Action: New Chat — clears `chat_messages` and returns to `/`
- Help: Open Usage Docs — quick help
- Action: Toggle Voice Recording — start/stop mic and transcribe to input
- Voice Playback: Enable/Disable — toggles speech synthesis for assistant replies
- Go: Boards / Discussions / Bulletin / Feature Requests — navigate the new community boards

Community boards
- Visit `/boards` for the high-level overview (Discussions, Bulletin, Feature Requests).
- Thread creation & replies land in Prisma via `/api/boards/[slug]/threads` and `/api/boards/[slug]/threads/[id]/posts`.
- Feature requests support status selection (Open, Under Review, Planned, Completed, Archived) and lightweight upvoting via `/api/boards/[slug]/threads/[id]/vote`.
- Default boards bootstrap automatically on first access; customise in `src/modules/discussions/data.js` if you need different seeds.
- Content limits: titles ≤120 chars, body ≤3k chars, replies ≤2.5k chars (validated with zod + server-side trimming).

Plugin example
- See `app/layout.tsx` for how `commands` are defined and passed to `src/components/CommandPalette.jsx`.
- `src/components/StatusBar.jsx` accepts a `cells` array to append custom cells.

Environment variables
- Client/server:
  - `NEXT_PUBLIC_API_TOKEN` (client-readable, used for dev to hit private chat)
  - `API_TOKEN` (server-side private check)
  - `OPENAI_API_KEY`, `OPENAI_MODEL` (and `OPENAI_PUBLIC_MODEL` optional)
  - ASR (faster-whisper): `ASR_PYTHON`, `ASR_MODEL`, `ASR_COMPUTE_TYPE`, `ASR_MAX_UPLOAD_BYTES`, `ASR_MAX_TEXT_LEN`, `ASR_TIMEOUT_MS`
  - `DATABASE_URL` or `PG*`
  - `NEXT_PUBLIC_API_TOKEN` (client dev)

Security assertions
- Token auth required on private endpoints; verify with:
  - `curl -H "Authorization: Bearer $API_TOKEN" http://localhost:8787/secure/ping`
  - `curl -H "Authorization: Bearer $API_TOKEN" -H 'Content-Type: application/json' -d '{"message":"hello"}' http://localhost:8787/api/echo-to-log`
- Add per‑IP rate limiting at your reverse proxy (Nginx/Caddy) in deployment.

Deployment (no Vercel)
- Next.js runs with `next start` behind your reverse proxy of choice (Nginx/Caddy/Envoy).
- Provide envs and wire TLS at the proxy; consider adding per-IP rate limiting.
- Postgres should be managed externally (managed service or your own instance).

Notes
- The project now runs purely on Next.js. Vite scaffolding has been removed.

Bundler notes
- Dev uses Turbopack via `next dev`. Production builds use the default Next.js bundler for v16.
- If you upgrade again and want to try `next build --turbo`, check the Next.js docs for current support first.

NPM scripts
- `npm run prepare:env` — copy `.env.example` to `.env` if missing
- `npm run db:init` — apply `sql/init.sql` via `psql`
- `npm run dev` — Turbopack dev server
- `npm run build` / `npm run start` — production build & serve
- `npm run db:migrate:lisp` (or `npm run db:migrate`) — SBCL SQL migration helper
- `npm test` — lightweight Node test suite
- `npm run lint` — ESLint

Voice transcription (faster-whisper)
- UI: Click the mic button in the composer (or use the Command Palette: "Toggle Voice Recording"). When you stop, the audio is transcribed into the input field.
- API: `POST /api/transcribe` accepts `multipart/form-data` with field `file` (<= 8MB). Returns `{ text }`.
- Server requirements:
  - Python 3 installed and available as `python3` (or set `ASR_PYTHON`).
  - Install Python deps: `pip install --upgrade faster-whisper`.
  - Optional: set `ASR_MODEL` (e.g., `tiny`, `base`, `small`, or a local model path). Defaults to `base`.
  - Public endpoint safeguards: file size limited, output clipped; no `/api/` requests are cached by the service worker.

Theming (Trivium)
- Default consumer theme: Trivium — Rhetoric (violet primary).
- Variants available: Grammar (amber), Logic (emerald), Rhetoric (violet).
- Tokens are defined in `app/globals.css` using Tailwind v4 `@theme` and exposed as utility classes like `bg-primary`, `text-muted`, `border-border`, `bg-surface`.
- The background uses a soft triadic gradient; links and focus rings use the current `--color-primary`.

Admin Controls
- Admin verification endpoint: `GET /api/admin/verify` — requires header `Authorization: Bearer ${API_TOKEN}`; returns `{ ok: true, role: 'admin' }` on success.
- Admin-only commands in the Command Palette:
  - Admin: Sign In — prompts for API token and verifies.
  - Theme: Trivium — Rhetoric / Logic / Grammar — switches theme and persists for admins.
  - Admin: Sign Out — clears admin token and resets to the default theme.
- Consumers do not see theme commands or theme status chip and always use the default Trivium theme.
