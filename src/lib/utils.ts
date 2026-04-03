import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Функция для определения контрастного цвета текста (черный или белый)
export function getContrastColor(hexColor: string): string {
  // Убираем # если есть
  const hex = hexColor.replace('#', '');
  
  // Конвертируем в RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Вычисляем яркость (luminance)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Если яркий цвет - возвращаем темный текст, если темный - светлый текст
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
