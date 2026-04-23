# Local Postgres (no Supabase cloud)

## Start stack (from repo root)

```bash
cp .env.example .env
# set TELEGRAM_BOT_TOKEN, JWT_SECRET (32+ chars), etc.

docker compose up -d --build
```

Postgres init runs SQL in `db/init/`. PostgREST listens inside the compose network; Caddy exposes `/rest/v1` and `/auth` on your site host.

## Vite dev (host machine)

1. `docker compose up -d postgres postgrest auth` (or full stack).
2. `pnpm dev` — `vite.config.ts` proxies `/rest/v1` → `localhost:3000`, `/auth` → `localhost:3001`.
3. `.env`: `VITE_PUBLIC_API_ORIGIN=` (empty = relative URLs on `localhost:8080`).

## Import existing data

```bash
pg_dump "$DATABASE_URL" --data-only --no-owner | docker compose exec -T postgres psql -U postgres -d obshak
```

(`DATABASE_URL` pointing at your old DB, or a Supabase direct Postgres URL if you still have it.)

## Python parsers

Use `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/obshak` and:

```bash
pip install -r parsers/requirements.txt
```

See `parsers/load_schedules_to_db.py` for the psycopg2 pattern. Other scripts may still reference the old Supabase client until migrated the same way.
