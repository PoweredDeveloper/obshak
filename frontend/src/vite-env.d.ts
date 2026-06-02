/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_ORIGIN?: string;
  readonly VITE_TELEGRAM_BOT_USERNAME?: string;
  readonly VITE_MAINTENANCE_MODE?: string;
  readonly VITE_TEST_MODE?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        openTelegramLink(url: string): void;
      };
    };
  }
}

export {};
