# AGENTS.md

This file is for future LLM/code agents working in this repository. Read it before editing.

## Project Overview

Obshak is a KGASU student schedule web app built with Vite, React, TypeScript, Tailwind, shadcn/ui components, Supabase local stack, and a Telegram bot/Mini App flow.

Main runtime pieces:

- Frontend: `src/`, built by `Dockerfile`, served through `nginx.conf` inside the `app` container.
- Public proxy: `Caddyfile`, mounted into the `caddy` container from `docker-compose.yml`.
- Telegram bot webhook: `telegram-bot/`, exposed at `/telegram-webhook`.
- Supabase local project: `supabase/`, normally started outside compose with `supabase start`.
- Database bootstrap SQL: `db/init/01_schema.sql`.
- Data parsers/loaders: `parsers/`.

The app is intended to work in two auth modes:

- Telegram Mini App: frontend reads `window.Telegram.WebApp.initData` and calls the Supabase Edge Function `telegram-auth`.
- Website/browser login: frontend uses the Telegram Login Widget and calls the same `telegram-auth` function with widget data.

## Important Commands

Install frontend dependencies:

```bash
npm install
```

Run local frontend:

```bash
npm run dev
```

Build frontend:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Start/rebuild production-ish Docker services:

```bash
docker compose up -d --build
```

Start Supabase local services:

```bash
supabase start
```

Deploy/run Supabase functions locally as appropriate for the current environment. The active Telegram auth function is:

```text
supabase/functions/telegram-auth/index.ts
```

## Environment

Do not commit real secrets. `.env` exists locally and contains deployment secrets; `.env.example` is the template.

Required public/frontend variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_TELEGRAM_BOT_USERNAME`
- `VITE_MAINTENANCE_MODE`
- `VITE_TEST_MODE`

Required server/bot/parser variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `MINI_APP_URL`
- `BASE_URL`

Supabase Studio is protected through Caddy basic auth on `studio.obshak.space`:

- `STUDIO_BASIC_AUTH_USER`
- `STUDIO_BASIC_AUTH_HASH`

Generate the hash with one of:

```bash
docker run --rm caddy:alpine caddy hash-password --plaintext 'your-strong-password'
htpasswd -nbB studio 'your-strong-password' | cut -d: -f2-
```

Keep direct access to Supabase Studio port `54323` closed at the server/firewall level. Caddy protects the `studio.obshak.space` entry point, but it cannot protect a directly exposed port.

## Routing And Auth Rules

Main app routes are in `src/App.tsx`.

Admin access is controlled by `src/hooks/use-admin.ts` and `src/contexts/AuthContext.tsx`. The source of truth is the `public.admins` table, matched by `profiles.telegram_id`.

Current admin UX:

- `/admin` is the schedule admin page.
- `/admin/schedule`, `/admin/users`, and `/admin/notifications` redirect to `/admin`.
- `/admin/services` remains the services management page.
- The profile admin button should link to `/admin`.
- Do not reintroduce users/stats/notifications admin pages unless explicitly requested.

When changing admin checks, preserve the separate `isAdminLoading` state. Without it, admin pages can redirect before the async admin lookup finishes and show a false `Доступ запрещен`.

## Supabase And Database Notes

Schema lives primarily in:

- `db/init/01_schema.sql`
- `supabase/migrations/`
- generated TypeScript types in `src/integrations/supabase/types.ts`

Frontend Supabase client:

```text
src/integrations/supabase/client.ts
```

Do not put service-role keys in frontend code. Use service-role only in trusted scripts, Edge Functions, or server-side code.

Important tables:

- `profiles`
- `admins`
- `groups`
- `lessons`
- `teachers`
- `teacher_ratings`
- `app_notifications`
- `app_settings`
- `services`
- `service_categories`

## Schedule UI Notes

Student class cards are in `src/components/schedule/ClassCard.tsx`.

Admin class cards are in `src/components/schedule/AdminClassCard.tsx`.

Lesson type colors are often HSL strings, for example `hsl(199, 85%, 55%)`. Use `getContrastColor` from `src/lib/utils.ts` for readable pill text. It supports HSL and hex; do not replace it with naive hex-only parsing.

Known visual requirement:

- In light theme, labels such as `По подгруппам` and `Лекция` must be dark/black on the light pill background.
- Dark theme should remain readable.

## Parsers

Teacher parsing/loading:

```bash
python3 -m pip install -r parsers/requirements.txt
python3 parsers/load_teachers_to_db.py
```

`parsers/load_teachers_to_db.py` reads `.env` from the project root even if called from another directory. It prefers `SUPABASE_URL` over `VITE_SUPABASE_URL` and requires `SUPABASE_SERVICE_ROLE_KEY`.

Schedule loaders/parsers live in `parsers/` and `parsers/llm-parser/`. Keep parser changes narrowly scoped; they are easy to break with broad cleanup.

## Code Style

- Prefer existing React hooks/components and shadcn/ui patterns.
- Use `rg` for searching.
- Keep edits scoped. Do not refactor unrelated code while fixing bugs.
- Avoid committing generated folders such as `__pycache__`, build output, or local data dumps.
- Preserve Russian UI copy unless the task asks for language changes.
- Use Tailwind semantic theme classes (`bg-background`, `text-foreground`, `text-muted-foreground`, etc.) for theme-aware UI.

## Git Safety

The worktree may contain user changes. Never reset or revert unrelated edits. Before editing, check:

```bash
git status --short
```

If a file already has unrelated changes, work with the current contents and avoid destructive commands.
