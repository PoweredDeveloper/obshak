# Production diagnostics (read-only checklist)

Last run: 2026-05-19 (after boss-fixes deploy, **no volumes removed**).

## Containers

| Service | Status |
|---------|--------|
| obshak-caddy-1 | Up |
| obshak-app-1 | Up |
| obshak-telegram-bot-1 | Up |
| obshak-backend-1 | Up (healthy) |
| supabase_kong / auth / db | Up (healthy) |

## HTTP timings (from server)

| URL | Result |
|-----|--------|
| `https://obshak.space/` | 200, TTFB ~0.1s |
| `https://obshak.space/auth/v1/health` | 200 |
| `POST https://obshak.space/telegram-webhook` | 200 |

## Caddy

- No recent `base64-decoding password` errors (broken `STUDIO_BASIC_AUTH_HASH` crash-loop).
- Studio block uses `env_file: .env`; bcrypt `$` must be escaped as `$$` in `.env`.

## Bot → Supabase

- `telegram-bot` container `SUPABASE_URL` must be `http://host.docker.internal:54321` (not `127.0.0.1`).
- Set in compose: `SUPABASE_URL: ${BOT_SUPABASE_URL:-http://host.docker.internal:54321}`.
- `/broadcast` admin check uses `GET /rest/v1/admins?telegram_id=eq.{id}`.

## Maintenance mode

- Build arg `VITE_MAINTENANCE_MODE=false` in `docker-compose.yml` (non-admins see stub if `true`).

## Slow load / “won’t open” (likely causes)

1. **Large JS bundle** — first visit downloads ~1MB+ assets.
2. **Auth chain** — browser → Caddy → `host.docker.internal:54321` for `/auth`, `/rest`, `/functions`.
3. **Telegram CDN** — `telegram-web-app.js` blocked/slow outside Telegram.
4. **Safari / reputation** — not fixed in app code alone.
5. **Caddy down / maintenance** — site 502 or maintenance screen for non-admins.

## After bot token rotation

See [telegram-bot/README.md](../telegram-bot/README.md) and [README.md](../README.md#telegram-bot-webhook-after-token-change).

```bash
python3 telegram-bot/set_webhook.py
```

## Safe deploy (no user data wipe)

```bash
supabase migration up --local
docker compose up -d --build app backend telegram-bot caddy   # never add -v
docker restart supabase_edge_runtime_obshak
```

Do **not** run: `docker compose down -v`, `supabase db reset`.
