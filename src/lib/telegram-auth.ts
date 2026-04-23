import { db, publicApiOrigin } from '@/integrations/postgrest/client';
import { getUser, setAccessToken } from '@/integrations/postgrest/session';

export interface DbProfile {
  id: string;
  telegram_id: number;
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
}

export interface TelegramLoginWidgetUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
    onTelegramAuth?: (user: TelegramLoginWidgetUser) => void;
  }
}

export function isTelegramWebApp(): boolean {
  return !!(window.Telegram?.WebApp?.initData);
}

export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData || null;
}

function telegramAuthUrl(): string {
  const o = publicApiOrigin();
  return o ? `${o}/auth/telegram` : '/auth/telegram';
}

export async function authenticateWithTelegram(initData: string): Promise<DbProfile> {
  const res = await fetch(telegramAuthUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData }),
  });
  const data = (await res.json()) as { access_token?: string; profile?: DbProfile; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Authentication failed');
  if (!data.access_token || !data.profile) throw new Error('Authentication failed');

  setAccessToken(data.access_token);
  return data.profile;
}

export async function authenticateWithLoginWidget(userData: TelegramLoginWidgetUser): Promise<DbProfile> {
  const res = await fetch(telegramAuthUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginWidgetData: userData }),
  });
  const data = (await res.json()) as { access_token?: string; profile?: DbProfile; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Authentication failed');
  if (!data.access_token || !data.profile) throw new Error('Authentication failed');

  setAccessToken(data.access_token);
  return data.profile;
}

export async function updateProfile(updates: Partial<DbProfile>): Promise<DbProfile> {
  const { data: { user } } = await getUser();
  if (!user) throw new Error('Not authenticated');

  const allowedFields = ['group_id', 'group_name', 'institute', 'course', 'semester', 'onboarded'];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      sanitized[key] = updates[key as keyof typeof updates];
    }
  }

  const { data, error } = await db
    .from('profiles')
    .update(sanitized)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw new Error(`Database error: ${error.message}`);
  if (!data) throw new Error('No profile returned');

  return data as DbProfile;
}

export async function fetchProfile(userId: string): Promise<DbProfile | null> {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as DbProfile | null) ?? null;
}
