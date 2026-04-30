import { motion } from 'framer-motion';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import type { TelegramLoginWidgetData } from '@/lib/telegram-auth';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initData?: string;
        initDataUnsafe?: {
          user?: unknown;
          [key: string]: unknown;
        };
      };
    };
    onTelegramAuth?: (user: TelegramLoginWidgetData) => void;
  }
}

export default function LoginPage() {
  const { isLoading, error, login, loginWithWidget } = useAuth();

  const botUsername = (
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined
  )?.trim();

  const [isTelegramWebApp, setIsTelegramWebApp] = useState<boolean | null>(null);

  useEffect(() => {
    const detectTelegramMiniApp = () => {
      const tg = window.Telegram?.WebApp;

      const isRealMiniApp =
        !!tg &&
        (
          !!tg.initData ||
          !!tg.initDataUnsafe?.user
        );

      if (isRealMiniApp) {
        setIsTelegramWebApp(true);

        tg.ready?.();
        tg.expand?.();
      } else {
        setIsTelegramWebApp(false);
      }
    };

    detectTelegramMiniApp();
    const interval = setInterval(detectTelegramMiniApp, 250);
    const stopPolling = setTimeout(() => clearInterval(interval), 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(stopPolling);
    };
  }, []);

  useEffect(() => {
    if (isTelegramWebApp !== false || !botUsername) return;

    const callbackName = 'onTelegramAuth';

    window[callbackName] = (user: TelegramLoginWidgetData) => {
      console.log('Telegram widget auth success:', user);
      void loginWithWidget(user);
    };

    const container = document.getElementById('telegram-login-widget');
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;

    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', `${callbackName}(user)`);

    container.appendChild(script);

    return () => {
      delete window[callbackName];
    };
  }, [botUsername, isTelegramWebApp, loginWithWidget]);

  const showWebsiteAuth = isTelegramWebApp === false;
  const showMiniAppAuth = isTelegramWebApp === true;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-8"
      >
        <GraduationCap className="w-12 h-12 text-primary" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-foreground mb-2 text-center"
      >
        Obshak
      </motion.h1>

      {isLoading || isTelegramWebApp === null ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mt-6"
        >
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-muted-foreground">
            Загрузка...
          </span>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-center max-w-xs"
        >
          <div className="flex items-center justify-center gap-2 text-destructive mb-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            {showMiniAppAuth
              ? 'Откройте приложение через Telegram бота'
              : 'Войдите через Telegram OAuth'}
          </p>

          {showMiniAppAuth && (
            <button
              onClick={login}
              className="schedule-card px-6 py-2.5 font-semibold text-card-foreground"
            >
              Попробовать снова
            </button>
          )}

          {showWebsiteAuth && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div id="telegram-login-widget" />

              {botUsername && (
                <p className="text-xs text-muted-foreground">
                  Также у нас есть бот:{' '}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    @{botUsername}
                  </a>
                </p>
              )}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-6 max-w-xs text-sm"
        >
          <p className="text-muted-foreground">
            {showMiniAppAuth
              ? 'Открываем вход через Telegram...'
              : 'Войдите через Telegram OAuth или откройте Mini App из бота'}
          </p>

          {showWebsiteAuth && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div id="telegram-login-widget" />

              {botUsername && (
                <p className="text-xs text-muted-foreground">
                  Также у нас есть бот:{' '}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    @{botUsername}
                  </a>
                </p>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}