import { supabase } from '@/integrations/supabase/client';

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

/**
 * Check if running inside Telegram Mini App
 */
export function isTelegramWebApp(): boolean {
  return !!(window.Telegram?.WebApp?.initData);
}

/**
 * Get Telegram Mini App initData if available
 */
export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData || null;
}

/**
 * Authenticate using Telegram Mini App initData
 */
export async function authenticateWithTelegram(initData: string): Promise<DbProfile> {
  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { initData },
  });

  if (error) throw new Error(error.message);
  if (!data?.token_hash || !data?.email) throw new Error('Authentication failed');

  const profile = data.profile as DbProfile;

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'magiclink',
  });

  if (otpError) throw new Error(`Session error: ${otpError.message}`);

  return profile;
}

/**
 * Authenticate using Telegram Login Widget callback data
 */
export async function authenticateWithLoginWidget(userData: TelegramLoginWidgetUser): Promise<DbProfile> {
  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { loginWidgetData: userData },
  });

  if (error) throw new Error(error.message);
  if (!data?.token_hash || !data?.email) throw new Error('Authentication failed');

  const profile = data.profile as DbProfile;

  const { error: otpError } = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: 'magiclink',
  });

  if (otpError) throw new Error(`Session error: ${otpError.message}`);

  return profile;
}

export async function updateProfile(updates: Partial<DbProfile>): Promise<DbProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const allowedFields = ['group_id', 'group_name', 'institute', 'course', 'semester', 'onboarded'];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      sanitized[key] = updates[key as keyof typeof updates];
    }
  }

  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as DbProfile | null) ?? null;
}
