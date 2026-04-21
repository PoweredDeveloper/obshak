import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { TelegramLoginWidgetUser } from '@/lib/telegram-auth';

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME;

export default function LoginPage() {
  const { isLoading, error, login, loginWithWidget, isWebApp } = useAuth();
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetLoadedRef = useRef(false);

  useEffect(() => {
    // Only load Login Widget for website users, not Mini App
    if (isWebApp || !BOT_USERNAME || widgetLoadedRef.current) return;

    // Define global callback for Telegram Login Widget
    window.onTelegramAuth = async (user: TelegramLoginWidgetUser) => {
      await loginWithWidget(user);
    };

    // Create and inject the Login Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'true');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');

    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(script);
      widgetLoadedRef.current = true;
    }

    return () => {
      // Cleanup
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = '';
      }
      delete window.onTelegramAuth;
    };
  }, [isWebApp, loginWithWidget]);

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

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-muted-foreground text-center max-w-xs text-sm mb-8"
      >
        Платформа для студентов КГАСУ
      </motion.p>

      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-muted-foreground">Авторизация...</span>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-xs"
        >
          <div className="flex items-center justify-center gap-2 text-destructive mb-3">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
          {isWebApp && (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Откройте приложение через Telegram бота
              </p>
              <button
                onClick={login}
                className="schedule-card px-6 py-2.5 font-semibold text-card-foreground"
              >
                Попробовать снова
              </button>
            </>
          )}
        </motion.div>
      ) : isWebApp ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2"
        >
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-muted-foreground">Загрузка...</span>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Telegram Login Widget container */}
          <div ref={widgetContainerRef} className="flex justify-center" />

          {!BOT_USERNAME && (
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              VITE_TELEGRAM_BOT_USERNAME не настроен
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
