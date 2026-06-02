import { supabase } from '@/integrations/supabase/client';

const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').toString().trim();
const API_BASE_URL = RAW_BASE.replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export interface ApiPage<T> {
  items: T[];
  total: number;
  has_more: boolean;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  auth?: 'required' | 'optional' | 'skip';
}

function buildUrl(path: string, query?: ApiOptions['query']): string {
  if (!API_BASE_URL) {
    throw new ApiError('VITE_API_URL is not configured', 0, null);
  }
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${API_BASE_URL}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, auth = 'optional' } = opts;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth !== 'skip') {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (auth === 'required') {
      throw new ApiError('Not authenticated', 401, null);
    }
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'omit',
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const detail =
      parsed && typeof parsed === 'object' && 'detail' in (parsed as Record<string, unknown>)
        ? (parsed as { detail: unknown }).detail
        : parsed;
    const message =
      typeof detail === 'string'
        ? detail
        : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export const API_BASE = API_BASE_URL;
