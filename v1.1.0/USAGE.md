# bhamjobs — Usage Guide

## Requirements
- Node.js 18+
- Yarn 4 (Berry, already configured via `packageManager`)
- PostgreSQL 13+
- SBCL (for Common Lisp migration runner) and `psql` CLI
- Optional: Python + faster-whisper model for voice transcription

## First-time Setup
1. Install dependencies:
   ```sh
   yarn install
   ```
2. Copy environment variables and edit to match your environment:
   ```sh
   cp .env.example .env
   ```
   - Set `API_TOKEN` and `NEXT_PUBLIC_API_TOKEN` (development can reuse the same value).
   - Supply `OPENAI_API_KEY`, `OPENAI_MODEL` (defaults to `gpt-4o-mini`), and optionally `OPENAI_PUBLIC_MODEL`.
   - Provide PostgreSQL credentials. Either keep `DATABASE_URL` or fill the discrete `PG*` vars.
   - For speech-to-text, configure `ASR_*` if you have faster-whisper installed.
3. Generate the Prisma client:
   ```sh
   yarn prisma generate
   ```
4. Apply database schema (pick one):
   - Prisma migration (preferred during active development):
     ```sh
     yarn prisma migrate dev --name board-init
     ```
   - Schema push (quick sync for prototypes):
     ```sh
     yarn prisma db push
     ```
   - SQL bootstrap (parity with existing Lisp runner):
     ```sh
     yarn db:init
     ```
5. Optional: seed default boards and logs by visiting `/boards` or running any board endpoint. The server auto-upserts the baseline boards.

## Local Development
```sh
yarn dev
```
- Runs Next.js App Router with Turbopack at http://localhost:3000.
- For Webpack mode (debugging), use:
  ```sh
  yarn dev:webpack
  ```

## Available Commands
- `yarn build`: Production build (`next build`).
- `yarn start`: Start production server (`next start`).
- `yarn setup`: Copies `.env` (if absent) and runs `yarn db:init`.
- `yarn db:migrate:lisp`: Executes the Common Lisp migration runner (`scripts/migrate.lisp`).
- `yarn lint`: Placeholder (no linter configured yet).

## Key Features
- **Chat assistant** at `/` with offline queueing, local persistence, and optional speech recognition (MediaRecorder + `/api/transcribe`).
- **Voice playback** for assistant replies. Toggle via the composer button, Command Palette, or Status Bar.
- **Community boards**:
  - `/boards` overview, `/boards/[slug]` per-board index, `/boards/[slug]/[threadId]` thread detail.
  - Feature Request board supports status tagging and upvotes.
  - APIs: `POST /api/boards/[slug]/threads`, `POST /api/boards/[slug]/threads/[threadId]/posts`, `POST /api/boards/[slug]/threads/[threadId]/vote`.
- **Command Palette** (Cmd/Ctrl+Enter) with shortcuts to boards, payments, and voice controls.
- **Status Bar** with voice/connectivity/build indicators.
- **Service worker** for connectivity pings and app shell caching.

## Voice & Transcription Notes
- Recording uses browser MediaRecorder; unsupported browsers will get an alert.
- `/api/transcribe` executes `scripts/transcribe.py`. Ensure the Python environment can access faster-whisper and matches env settings (`ASR_MODEL`, `ASR_COMPUTE_TYPE`).
- Speech synthesis uses the Web Speech API; browser choice affects voice list.

## Persistence & Storage
- Chat messages stored in `localStorage` (`chat_messages`), offline queue in `chat_queue`.
- Community boards persist via Prisma models (`forum_board`, `discussion_thread`, `discussion_post`).
- Logs (e.g., OpenAI failures) stored in `app_log`.

## Testing / Verification
- Manual smoke:
  - Visit `/` to verify chat, voice toggle, and command palette.
  - Visit `/boards`, create a thread, reply, and upvote in feature board.
  - Exercise `/api/openai/public-chat` via curl (see README for example).
- Automated tests: `yarn test` (uses Node’s built-in test runner).

## Deployment Tips
- Run `yarn build` then `yarn start` behind your proxy (Nginx/Caddy) with TLS, rate limiting, and environment variables supplied.
- Ensure Postgres and Prisma migrations run as part of your release pipeline.
- Configure reverse proxy caching rules to avoid caching `/api/*`.

## VS Code Integration
- Open the command palette (`Cmd/Ctrl+Shift+P`) → “Tasks: Run Task” to access the predefined tasks (`Dev Server`, `Build`, `Test`, `Prisma Generate`, `Prisma Migrate`).
- Tasks live in `.vscode/tasks.json`; customise or add new ones to match your workflow.
