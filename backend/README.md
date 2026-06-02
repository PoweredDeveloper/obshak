# Obshak Backend (FastAPI)

Public API for Obshak. Hosts under `api.obshak.space` (production) and exposes
Swagger UI at `/docs` (Bearer auth — paste your Supabase access token to try
authenticated endpoints).

## Stack

- FastAPI + Uvicorn
- asyncpg connection pool against the existing Supabase Postgres
- Auth: **`GET {SUPABASE_URL}/auth/v1/user`** with the access token + publishable
  key (same as Supabase JS). Falls back to local HS256 decode only if URL/key unset.

## Layout

```
backend/
  app/
    main.py            FastAPI app + middleware + OpenAPI security scheme
    config.py          Pydantic settings
    deps.py            FastAPI dependencies (db pool, current user)
    security.py        Telegram auth + JWT helpers
    db/                Connection pool + queries
    routers/           HTTP routes
    schemas/           Pydantic request/response models
```

## Run locally

```bash
cd backend
cp .env.example .env       # then edit DATABASE_URL + SUPABASE_JWT_SECRET
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
open http://127.0.0.1:8000/docs
```

## Run with Docker Compose

The project compose file already wires `backend` and `caddy` together.

```bash
docker compose up -d --build backend caddy
```

`api.obshak.space` is reverse-proxied by Caddy to the `backend` container on
port 8000.

## Auth flow

1. Frontend obtains a Supabase access token via the existing Telegram auth flow
   (Edge Function `telegram-auth` + `verifyOtp`).
2. Frontend sends `Authorization: Bearer <access_token>` to this API.
3. Backend calls GoTrue with that header + `apikey: <publishable key>`. Response
   gives `id` (profile UUID) and `user_metadata` (e.g. `telegram_id`).

**Docker:** `SUPABASE_URL` in `.env` often is `http://127.0.0.1:54321` (host-only).
Set `BACKEND_SUPABASE_URL=http://host.docker.internal:54321` (or public
`https://obshak.space`) so the **container** can reach Kong.

If neither URL+key nor `SUPABASE_JWT_SECRET` is configured, protected routes return
`server_misconfigured`.

A future `/auth/telegram` endpoint (issuing our own JWTs) will let us drop
Supabase Auth altogether — see `app/routers/auth.py` for the scaffold.

## Adding new endpoints

1. Add request/response models in `app/schemas/`.
2. Add SQL/business logic in `app/db/` (parameterized asyncpg queries).
3. Add a router in `app/routers/` with `dependencies=[Depends(get_current_user)]`
   for protected endpoints.
4. Mount the router in `app/main.py`.
5. Update Swagger tags in `OPENAPI_TAGS` if needed.
