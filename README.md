# Obshak

Платформа для студентов КГАСУ: расписание, преподаватели, услуги, общение.

On your VDS:

# 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

# 2. Clone or upload your project

```bash
git clone https://github.com/Damirbaytik/obshak.git obshak
cd obshak
```

# 3. Create .env from example

```bash
cp .env.example .env
nano .env # fill in your values
```

# 4. Make sure domain DNS points to your VDS

A record: obshak.online -> your VDS IP

# 5. Start everything

```bash
docker compose up -d --build
```

Caddy TLS material lives under **`./data/caddy-data/`** and **`./data/caddy-config/`** (bind mounts). **`docker compose down -v` still removes the Postgres volume** (`obshak_pgdata`); it does **not** delete those directories, so certificates are kept unless you remove `data/` yourself. To stop without dropping volumes: `docker compose down` (no `-v`).

**Migrating from old compose:** copy certs out of the old `caddy_data` volume if needed, or let Caddy re-issue after rate limits clear.

Required .env values:

- `TELEGRAM_BOT_TOKEN` — from @BotFather
- `VITE_TELEGRAM_BOT_USERNAME` — bot username (no @)
- `JWT_SECRET` — at least 32 characters; must match between PostgREST and auth service (see `.env.example`)
- `VITE_PUBLIC_API_ORIGIN` — leave empty when Caddy serves `/rest/v1` and `/auth` on the same host as the SPA
- `MINI_APP_URL` / `BASE_URL` — your public site URL

Stack: **Postgres** (data), **PostgREST** (`/rest/v1`), **auth-service** (`/auth/telegram` → JWT), **nginx** SPA, **Caddy** TLS + routing.

Caddy will automatically:

- Obtain SSL certificate from Let's Encrypt
- Redirect HTTP → HTTPS
- Proxy `/rest/*` to PostgREST, `/auth/*` to auth, `/telegram-webhook*` to the bot, and everything else to the SPA

Note: Make sure port 80 and 443 are open on your VDS firewall, and DNS is configured before starting (Caddy needs to verify domain ownership).
