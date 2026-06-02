import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseHslColor(input: string): { h: number; s: number; l: number } | null {
  const m = input.trim().match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  const m = light - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh >= 0 && hh < 1) [rp, gp, bp] = [c, x, 0];
  else if (hh < 2) [rp, gp, bp] = [x, c, 0];
  else if (hh < 3) [rp, gp, bp] = [0, c, x];
  else if (hh < 4) [rp, gp, bp] = [0, x, c];
  else if (hh < 5) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function srgbChannelToLinear(c: number) {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const R = srgbChannelToLinear(rgb.r);
  const G = srgbChannelToLinear(rgb.g);
  const B = srgbChannelToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Soft pill fill for lesson type labels; works with HSL strings from schedule hooks. */
export function lessonTypePillBackground(baseColor: string, alpha = 0.2): string {
  const hsl = parseHslColor(baseColor);
  if (hsl) {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`;
  }
  const hex = baseColor.replace("#", "").trim();
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    const a = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${hex}${a}`;
  }
  if (/^[0-9a-fA-F]{8}$/.test(hex)) {
    return `#${hex}`;
  }
  return "hsl(var(--muted) / 0.35)";
}

// Контрастный цвет текста для фона (hex, hsl(), rgb())
export function getContrastColor(color: string): string {
  const hsl = parseHslColor(color);
  if (hsl) {
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    return relativeLuminance(rgb) > 0.55 ? "#000000" : "#FFFFFF";
  }

  const rgbFn = color
    .trim()
    .match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbFn) {
    const rgb = {
      r: Number(rgbFn[1]),
      g: Number(rgbFn[2]),
      b: Number(rgbFn[3]),
    };
    return relativeLuminance(rgb) > 0.55 ? "#000000" : "#FFFFFF";
  }

  const hex = color.replace("#", "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) {
    return "#000000";
  }

  const fullHex = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return "#000000";
  }

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
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
