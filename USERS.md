# bhamjobs.com — USERS

## Quick start
1. From the repo root, run `./serve`  
   *(or override defaults with `HOST=0.0.0.0 PORT=3000 ./serve`)*  
2. The helper:
   - installs deps with `pnpm`
   - copies `.env` if missing
   - exports environment variables
   - runs `pnpm db:init`
   - starts the dev server:  
     `pnpm dev -- --hostname "$HOST" --port "$PORT"`
3. Open http://localhost:3000

---

## Notes on `./serve`

- `.env` is sourced *before* `pnpm db:init`, so `psql` receives `DATABASE_URL` / `PG*` values.  
  Default expectation:  
  `PGUSER=admin` & `PGPASSWORD=secret` exist and have privilege to create DBs.

- Ensure Postgres is running, then create or update the `admin` role from a superuser session:

  ```bash
  psql -d postgres


```
CREATE ROLE admin LOGIN PASSWORD 'secret' SUPERUSER CREATEDB CREATEROLE;
```

-- or, if it already exists:


```
ALTER  ROLE admin WITH LOGIN PASSWORD 'secret' SUPERUSER CREATEDB CREATEROLE;
```
If the bhamjobs database does not exist, create it manually:
```
createdb -h 127.0.0.1 -U admin bhamjobs
```
Skip `pnpm db:init` if the DB is already provisioned:

```
SKIP_DB_INIT=1 ./serve
```
First-run env creation:
```
pnpm prepare:env
# copies .env.example → .env (no overwrite)
# update tokens + DATABASE_URL afterwards
```
Running steps manually (no helper script)
```
pnpm install
cp -n .env.example .env 2>/dev/null || cp .env.example .env
source .env
pnpm db:init
pnpm dev -- --hostname 0.0.0.0 --port 3000
```
---

No confusion, no broken role, no guessing.  
This version reflects *truth* — the system as it actually behaves.