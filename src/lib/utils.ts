import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

export function safeTelegramLinkWithPrefilledText(url: string, text: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("text", text);
    return parsed.toString();
  } catch {
    return url;
  }
}
