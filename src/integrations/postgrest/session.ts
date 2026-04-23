const STORAGE_KEY = 'obshak_access_token';

type SessionUser = { id: string };
export type AppSession = { access_token: string; user: SessionUser };

type AuthListener = (event: 'SIGNED_IN' | 'SIGNED_OUT' | string, session: AppSession | null) => void;
const listeners = new Set<AuthListener>();

function parseJwtSub(token: string): string | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64)) as { sub?: string };
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

function buildSession(token: string): AppSession | null {
  const sub = parseJwtSub(token);
  if (!sub) return null;
  return { access_token: token, user: { id: sub } };
}

export function setAccessToken(token: string | null): void {
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);

  if (token) {
    const session = buildSession(token);
    if (session) listeners.forEach((l) => l('SIGNED_IN', session));
  } else {
    listeners.forEach((l) => l('SIGNED_OUT', null));
  }
}

export async function getSession(): Promise<{ data: { session: AppSession | null }; error: null }> {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return { data: { session: null }, error: null };
  const session = buildSession(token);
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return { data: { session: null }, error: null };
  }
  return { data: { session }, error: null };
}

export async function getUser(): Promise<{ data: { user: SessionUser | null }; error: null }> {
  const { data } = await getSession();
  return { data: { user: data.session?.user ?? null }, error: null };
}

export function onAuthStateChange(cb: AuthListener): {
  data: { subscription: { unsubscribe: () => void } };
} {
  listeners.add(cb);
  return {
    data: {
      subscription: {
        unsubscribe: () => {
          listeners.delete(cb);
        },
      },
    },
  };
}

export async function signOut(): Promise<void> {
  setAccessToken(null);
}

export const auth = {
  getSession,
  onAuthStateChange,
  signOut,
  getUser,
};
