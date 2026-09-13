// Personal shop themes. A shop theme tints the storefront's surfaces —
// accent, page background, typography and corner style — so every shop can
// feel like its own place while keeping the shared layout bones.

import type { CSSProperties } from "react";

export type ShopTheme = {
  accent: string;
  accentText: string;
  page: string;
  pageText: string;
  font: string;
  corners: string;
  emoji: string;
  banner?: string;
};

export const SHOP_THEME_PRESETS: { name: string; theme: ShopTheme }[] = [
  {
    name: "Classic",
    theme: {
      accent: "#C63125",
      accentText: "#FFFFFF",
      page: "#FAF7F5",
      pageText: "#191414",
      font: "system",
      corners: "square",
      emoji: "🏪",
    },
  },
  {
    name: "Bakery",
    theme: {
      accent: "#B45309",
      accentText: "#FFF7ED",
      page: "#FDF8F3",
      pageText: "#2B1A0E",
      font: "serif",
      corners: "soft",
      emoji: "🥐",
    },
  },
  {
    name: "Candy",
    theme: {
      accent: "#DB2777",
      accentText: "#FFFFFF",
      page: "#FDF5F8",
      pageText: "#33121F",
      font: "rounded",
      corners: "round",
      emoji: "🍬",
    },
  },
  {
    name: "Sports",
    theme: {
      accent: "#1D4ED8",
      accentText: "#FFFFFF",
      page: "#F5F8FC",
      pageText: "#0E1520",
      font: "system",
      corners: "square",
      emoji: "🏀",
    },
  },
  {
    name: "Tech",
    theme: {
      accent: "#0F766E",
      accentText: "#FFFFFF",
      page: "#F3FAFA",
      pageText: "#0E1A1A",
      font: "mono",
      corners: "square",
      emoji: "💾",
    },
  },
  {
    name: "Mint",
    theme: {
      accent: "#15803D",
      accentText: "#FFFFFF",
      page: "#F4FAF5",
      pageText: "#0F1A12",
      font: "rounded",
      corners: "soft",
      emoji: "🌱",
    },
  },
];

export const THEME_FONTS: { id: string; name: string; stack: string }[] = [
  {
    id: "system",
    name: "Classic",
    stack:
      '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif',
  },
  {
    id: "mono",
    name: "Typewriter",
    stack:
      '"SF Mono", "Cascadia Mono", "Roboto Mono", ui-monospace, monospace',
  },
  {
    id: "rounded",
    name: "Friendly",
    stack:
      '"Trebuchet MS", "Segoe UI", Verdana, "Liberation Sans", sans-serif',
  },
  {
    id: "serif",
    name: "Bookish",
    stack: 'Georgia, "Times New Roman", "Liberation Serif", serif',
  },
];

export const THEME_CORNERS: { id: string; name: string; radius: string }[] = [
  { id: "square", name: "Square", radius: "0rem" },
  { id: "soft", name: "Soft", radius: "0.5rem" },
  { id: "round", name: "Round", radius: "1.25rem" },
];

export const DEFAULT_SHOP_THEME: ShopTheme = SHOP_THEME_PRESETS[0].theme;

/** Resolve a stored theme object (possibly partial/null) to a full theme. */
export function resolveShopTheme(theme: unknown): ShopTheme {
  if (!theme || typeof theme !== "object") return { ...DEFAULT_SHOP_THEME };
  const t = theme as Record<string, unknown>;
  const isHex = (v: unknown) =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
  return {
    accent: isHex(t.accent) ? (t.accent as string) : DEFAULT_SHOP_THEME.accent,
    accentText: isHex(t.accentText)
      ? (t.accentText as string)
      : DEFAULT_SHOP_THEME.accentText,
    page: isHex(t.page) ? (t.page as string) : DEFAULT_SHOP_THEME.page,
    pageText: isHex(t.pageText)
      ? (t.pageText as string)
      : DEFAULT_SHOP_THEME.pageText,
    font:
      typeof t.font === "string" && THEME_FONTS.some((f) => f.id === t.font)
        ? t.font
        : DEFAULT_SHOP_THEME.font,
    corners:
      typeof t.corners === "string" &&
      THEME_CORNERS.some((c) => c.id === t.corners)
        ? t.corners
        : DEFAULT_SHOP_THEME.corners,
    emoji:
      typeof t.emoji === "string" && t.emoji.trim()
        ? t.emoji
        : DEFAULT_SHOP_THEME.emoji,
    banner: typeof t.banner === "string" ? t.banner : undefined,
  };
}

const CORNER_VAR: Record<string, string> = {
  square: "0rem",
  soft: "0.5rem",
  round: "1.25rem",
};

/**
 * Apply a shop theme to the storefront by re-mapping the app's shadcn token
 * variables on the storefront root. Every component inside — buttons, inputs,
 * cards, borders — picks the shop's personal theme up automatically.
 */
export function shopThemeStyle(theme: ShopTheme): CSSProperties {
  const fontStack =
    THEME_FONTS.find((f) => f.id === theme.font)?.stack ?? THEME_FONTS[0].stack;
  const radius = CORNER_VAR[theme.corners] ?? CORNER_VAR.square;
  return {
    background: theme.page,
    color: theme.pageText,
    fontFamily: fontStack,
    ["--background" as string]: theme.page,
    ["--foreground" as string]: theme.pageText,
    ["--card" as string]: "#FFFFFF",
    ["--card-foreground" as string]: theme.pageText,
    ["--muted" as string]: `color-mix(in srgb, ${theme.pageText} 7%, ${theme.page})`,
    ["--muted-foreground" as string]: `color-mix(in srgb, ${theme.pageText} 72%, ${theme.page})`,
    ["--accent" as string]: theme.accent,
    ["--accent-foreground" as string]: theme.accentText,
    ["--primary" as string]: theme.accent,
    ["--primary-foreground" as string]: theme.accentText,
    ["--secondary" as string]: theme.accent,
    ["--secondary-foreground" as string]: theme.accentText,
    ["--ring" as string]: theme.accent,
    ["--border" as string]: theme.pageText,
    ["--input" as string]: theme.pageText,
    ["--shop-radius" as string]: radius,
    ["--shop-page" as string]: theme.page,
    ["--shop-page-text" as string]: theme.pageText,
  };
}

export const SHOP_EMOJI_CHOICES = [
  "🏪",
  "🥐",
  "🍪",
  "🍕",
  "🍬",
  "🧁",
  "🏀",
  "🎮",
  "🎨",
  "🌱",
  "💾",
  "📚",
  "✏️",
  "🧢",
  "🎧",
  "☕",
];

export const ITEM_EMOJI_CHOICES = [
  "",
  "🍬",
  "🍪",
  "🍫",
  "🍕",
  "🥪",
  "🧁",
  "🍎",
  "🥤",
  "☕",
  "🧢",
  "🎧",
  "✏️",
  "📚",
  "🎮",
  "⭐",
];
