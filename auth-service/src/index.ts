import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import pg from 'pg';
import { SignJWT } from 'jose';
import { validateInitData, validateLoginWidgetData } from './telegram.js';

const { Pool } = pg;

const PORT = Number(process.env.PORT ?? 3001);
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/obshak';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-change-this-secret-min-32-chars!!');
const JWT_EXP_SEC = Number(process.env.JWT_EXP_SEC ?? 60 * 60 * 24 * 30);

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw) {
    return [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
    ];
  }
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

const pool = new Pool({ connectionString: DATABASE_URL });

const app = new Hono();

app.use(
  '*',
  cors({
    origin: (origin) => {
      const allowed = parseAllowedOrigins();
      if (!origin) return allowed[0];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    allowHeaders: ['authorization', 'content-type'],
    allowMethods: ['POST', 'OPTIONS'],
  }),
);

app.post('/auth/telegram', async (c) => {
  if (!TELEGRAM_BOT_TOKEN) {
    return c.json({ error: 'TELEGRAM_BOT_TOKEN is not configured' }, 500);
  }

  let body: { initData?: string; loginWidgetData?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { initData, loginWidgetData } = body;

  let telegramId: number;
  let firstName: string;
  let lastName: string | null;
  let username: string | null;
  let photoUrl: string | null;

  try {
    if (typeof initData === 'string') {
      const parsed = validateInitData(initData, TELEGRAM_BOT_TOKEN);
      const userStr = parsed.user;
      if (!userStr) return c.json({ error: 'No user in initData' }, 401);
      const tgUser = JSON.parse(userStr) as Record<string, unknown>;
      telegramId = Number(tgUser.id);
      firstName = String(tgUser.first_name ?? 'User');
      lastName = (tgUser.last_name as string) ?? null;
      username = (tgUser.username as string) ?? null;
      photoUrl = (tgUser.photo_url as string) ?? null;
      const authDate = parseInt(parsed.auth_date ?? '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > 86400) {
        return c.json({ error: 'Auth data is outdated' }, 401);
      }
    } else if (loginWidgetData && typeof loginWidgetData === 'object') {
      const validated = validateLoginWidgetData(
        loginWidgetData as Parameters<typeof validateLoginWidgetData>[0],
        TELEGRAM_BOT_TOKEN,
      );
      telegramId = validated.id;
      firstName = validated.first_name;
      lastName = validated.last_name;
      username = validated.username;
      photoUrl = validated.photo_url;
      const now = Math.floor(Date.now() / 1000);
      if (now - validated.auth_date > 604800) {
        return c.json({ error: 'Auth data is outdated' }, 401);
      }
    } else {
      return c.json({ error: 'Missing initData or loginWidgetData' }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Validation failed';
    return c.json({ error: msg }, 401);
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      id: string;
      telegram_id: string;
      first_name: string;
      last_name: string | null;
      username: string | null;
      photo_url: string | null;
      group_id: string | null;
      group_name: string | null;
      institute: string | null;
      course: number | null;
      semester: number | null;
      onboarded: boolean;
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO public.profiles (telegram_id, first_name, last_name, username, photo_url)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (telegram_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         username = EXCLUDED.username,
         photo_url = EXCLUDED.photo_url,
         updated_at = now()
       RETURNING id, telegram_id::text, first_name, last_name, username, photo_url,
         group_id::text, group_name, institute, course, semester, onboarded, created_at::text, updated_at::text`,
      [telegramId, firstName, lastName, username, photoUrl],
    );

    const row = rows[0];
    if (!row) return c.json({ error: 'Profile upsert failed' }, 500);

    const profile = {
      id: row.id,
      telegram_id: Number(row.telegram_id),
      first_name: row.first_name,
      last_name: row.last_name,
      username: row.username,
      photo_url: row.photo_url,
      group_id: row.group_id,
      group_name: row.group_name,
      institute: row.institute,
      course: row.course,
      semester: row.semester,
      onboarded: row.onboarded,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    const accessToken = await new SignJWT({
      role: 'authenticated',
      telegram_id: telegramId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(row.id)
      .setIssuedAt()
      .setExpirationTime(`${JWT_EXP_SEC}s`)
      .sign(JWT_SECRET);

    return c.json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: JWT_EXP_SEC,
      profile,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Authentication failed' }, 500);
  } finally {
    client.release();
  }
});

app.get('/health', (c) => c.json({ ok: true }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`auth listening on ${info.port}`);
});
