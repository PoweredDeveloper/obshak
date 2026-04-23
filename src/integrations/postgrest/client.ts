import { PostgrestClient } from '@supabase/postgrest-js';
import type { Database } from '@/integrations/postgrest/types';

/** Same host as the SPA in dev (Vite proxy); full origin in production if needed */
export function publicApiOrigin(): string {
  return (import.meta.env.VITE_PUBLIC_API_ORIGIN as string | undefined)?.replace(/\/$/, '') ?? '';
}

export function postgrestUrl(): string {
  const o = publicApiOrigin();
  return o ? `${o}/rest/v1` : '/rest/v1';
}

function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = localStorage.getItem('obshak_access_token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export const db = new PostgrestClient<Database>(postgrestUrl(), {
  global: { fetch: authFetch },
});
