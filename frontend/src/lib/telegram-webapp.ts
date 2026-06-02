declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initData?: string;
        initDataUnsafe?: {
          user?: unknown;
        };
      };
    };
  }
}

let sdkLoadPromise: Promise<void> | null = null;

/** Load same-origin SDK (public/telegram-web-app.js). Safe to call multiple times. */
export function loadTelegramWebAppSdk(): Promise<void> {
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-obshak-telegram-sdk]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Telegram SDK failed')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = '/telegram-web-app.js';
    script.async = true;
    script.dataset.obshakTelegramSdk = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Telegram SDK failed'));
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/** initData from SDK or #tgWebAppData=… hash (before SDK is ready). */
export function getTelegramInitDataFromPage(): string | null {
  const fromSdk = window.Telegram?.WebApp?.initData;
  if (fromSdk) return fromSdk;

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const tgWebAppData = params.get('tgWebAppData');
  if (tgWebAppData) return tgWebAppData;

  return null;
}

export function isLikelyTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.hash.includes('tgWebAppData')) return true;
  if (window.Telegram?.WebApp?.initData) return true;
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) return true;
  if (/Telegram/i.test(navigator.userAgent || '')) return true;
  return false;
}

/** Wait for SDK + initData (Telegram sometimes injects hash before WebApp object exists). */
export async function ensureTelegramInitData(options?: {
  timeoutMs?: number;
  pollMs?: number;
}): Promise<string | null> {
  const timeoutMs = options?.timeoutMs ?? 6000;
  const pollMs = options?.pollMs ?? 100;
  const deadline = Date.now() + timeoutMs;

  if (isLikelyTelegramMiniApp()) {
    try {
      await loadTelegramWebAppSdk();
      window.Telegram?.WebApp?.ready?.();
      window.Telegram?.WebApp?.expand?.();
    } catch {
      // Still try hash fallback below.
    }
  }

  while (Date.now() < deadline) {
    const initData = getTelegramInitDataFromPage();
    if (initData) return initData;
    await new Promise((r) => window.setTimeout(r, pollMs));
  }

  return getTelegramInitDataFromPage();
}
