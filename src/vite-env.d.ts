/// <reference types="vite/client" />

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
