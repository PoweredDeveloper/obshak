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

**A/AAAA** for the **exact hostname** in `Caddyfile` (first token on the site line, e.g. `obshak.space`) must point to this server (or use Cloudflare + origin cert — see earlier notes). For **`www`**, add a second site block or use `obshak.space, www.obshak.space {` on one line.

**Using another domain:** edit `Caddyfile` site name → set `.env` `MINI_APP_URL`, `BASE_URL`, and include the same origin in `ALLOWED_ORIGINS` → `docker compose up -d --build` (frontend embeds `VITE_TELEGRAM_BOT_USERNAME` only; leave `VITE_PUBLIC_API_ORIGIN` empty if the SPA and API share this host) → set Telegram [webhook](https://core.telegram.org/bots/api#setwebhook) and BotFather Mini App URL to `https://<your-domain>/…`.

# 5. Start everything

Full production steps (local Supabase + DNS + webhook + data restore): **[docs/STARTUP.md](docs/STARTUP.md)**.

```bash
export PATH="/root/.local/share/supabase:$PATH"   # if CLI not on PATH
supabase start
docker compose up -d --build
python3 telegram-bot/set_webhook.py
```

Frontend app lives in `frontend/` (see `frontend/package.json`). Local dev: `cd frontend && npm run dev`.

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

## Telegram bot webhook (after token change)

If you rotated `TELEGRAM_BOT_TOKEN` (leaked token, new bot, etc.):

1. Update `TELEGRAM_BOT_TOKEN` in `.env`.
2. Rebuild the bot: `docker compose up -d --build telegram-bot`.
3. Register webhook (see **[telegram-bot/README.md](telegram-bot/README.md)**):
   ```bash
   pip install aiohttp python-dotenv
   python3 telegram-bot/set_webhook.py
   ```
4. Confirm: `curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` → `url` is `https://<your-domain>/telegram-webhook`.
5. Test `/start` in Telegram. Admins need a row in `public.admins` for `/broadcast`.

Use `BOT_SUPABASE_URL=http://host.docker.internal:54321` in `.env` so the bot container can reach Supabase (not `127.0.0.1`).
