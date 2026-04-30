import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Функция для определения контрастного цвета текста (черный или белый)
export function getContrastColor(hexColor: string): string {
  const hslMatch = hexColor.match(/hsla?\(\s*[\d.]+(?:deg|rad|turn)?\s*,\s*[\d.]+%\s*,\s*([\d.]+)%/i);
  if (hslMatch) {
    return Number(hslMatch[1]) > 45 ? '#000000' : '#FFFFFF';
  }

  // Убираем # если есть
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    return '#000000';
  }
  
  // Конвертируем в RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
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
