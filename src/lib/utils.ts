import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Разрешены только https://t.me/ и https://telegram.me/ (без embedded credentials).
 * Снижает риск открытия произвольных ссылок из настроек уведомлений.
 */
export function parseSafeTelegramHttpsUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "t.me" && host !== "telegram.me") return null;
  if (url.username || url.password) return null;
  return url;
}

/** Безопасно добавляет query-параметр text к ссылке Telegram. */
export function safeTelegramLinkWithPrefilledText(baseUrl: string, text: string): string | null {
  const u = parseSafeTelegramHttpsUrl(baseUrl.trim());
  if (!u) return null;
  u.searchParams.set("text", text);
  return u.toString();
}

// Функция для определения контрастного цвета текста (черный или белый)
export function getContrastColor(hexColor: string): string {
  // Убираем # если есть и проверяем формат
  const hex = hexColor.replace('#', '');

  // Валидация: hex должен быть 3 или 6 символов
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return '#000000'; // Fallback для невалидного цвета
  }

  // Расширенный формат (например, #fff -> #ffffff)
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;

  // Конвертируем в RGB
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Проверка на NaN (на случай если parseInt не сработал)
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return '#000000';
  }

  // Вычисляем яркость (luminance)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Если яркий цвет - возвращаем темный текст, если темный - светлый текст
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
