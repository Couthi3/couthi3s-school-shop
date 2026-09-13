// Site-wide accent color. The user picks a base color and the whole site —
// background tint, buttons, rings, labels — re-tints to match. Palettes are
// curated light themes written straight onto the theme CSS variables, so
// every existing component picks them up automatically.

export type AppColorId =
  | "red"
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "pink"
  | "teal"
  | "mono";

type Palette = {
  id: AppColorId;
  name: string;
  swatch: string; // hex shown in the picker
  bg: string;
  ink: string;
  muted: string;
  mutedInk: string;
  border: string;
  input: string;
  primary: string;
  onPrimary: string;
};

const PALETTES: Palette[] = [
  {
    id: "red",
    name: "Classic Red",
    swatch: "#C63125",
    bg: "#FAF7F5",
    ink: "#191414",
    muted: "#F1EAE6",
    mutedInk: "#6E605A",
    border: "#DDD2CB",
    input: "#C9BBB3",
    primary: "#C63125",
    onPrimary: "#FFFFFF",
  },
  {
    id: "blue",
    name: "Notebook Blue",
    swatch: "#1D4ED8",
    bg: "#F5F8FC",
    ink: "#10151C",
    muted: "#E8EEF6",
    mutedInk: "#5A6B80",
    border: "#D3DEEB",
    input: "#BCCBE0",
    primary: "#1D4ED8",
    onPrimary: "#FFFFFF",
  },
  {
    id: "green",
    name: "Cafeteria Green",
    swatch: "#15803D",
    bg: "#F4FAF5",
    ink: "#0F1A12",
    muted: "#E3F1E6",
    mutedInk: "#4F6B56",
    border: "#CFE4D4",
    input: "#B4D3BC",
    primary: "#15803D",
    onPrimary: "#FFFFFF",
  },
  {
    id: "purple",
    name: "Hallway Purple",
    swatch: "#7C3AED",
    bg: "#F9F7FC",
    ink: "#17121F",
    muted: "#EFEAF7",
    mutedInk: "#635577",
    border: "#DED5EC",
    input: "#C9BCE0",
    primary: "#7C3AED",
    onPrimary: "#FFFFFF",
  },
  {
    id: "orange",
    name: "Marker Orange",
    swatch: "#EA580C",
    bg: "#FDF8F3",
    ink: "#1C1410",
    muted: "#F7EDE2",
    mutedInk: "#7A6353",
    border: "#EDDCCC",
    input: "#DFC7AE",
    primary: "#EA580C",
    onPrimary: "#FFFFFF",
  },
  {
    id: "pink",
    name: "Sticker Pink",
    swatch: "#DB2777",
    bg: "#FDF5F8",
    ink: "#1D1218",
    muted: "#F8E9EF",
    mutedInk: "#77586A",
    border: "#EFD5E1",
    input: "#E2B9CE",
    primary: "#DB2777",
    onPrimary: "#FFFFFF",
  },
  {
    id: "teal",
    name: "Whiteboard Teal",
    swatch: "#0F766E",
    bg: "#F3FAFA",
    ink: "#0F1A1A",
    muted: "#E2F1F1",
    mutedInk: "#4F6B6B",
    border: "#CFE4E4",
    input: "#B2D1D1",
    primary: "#0F766E",
    onPrimary: "#FFFFFF",
  },
  {
    id: "mono",
    name: "Chalkboard",
    swatch: "#111111",
    bg: "#F7F7F7",
    ink: "#111111",
    muted: "#ECECEC",
    mutedInk: "#5E5E5E",
    border: "#D9D9D9",
    input: "#BFBFBF",
    primary: "#111111",
    onPrimary: "#FFFFFF",
  },
];

export const APP_COLORS = PALETTES.map(({ id, name, swatch }) => ({
  id,
  name,
  swatch,
}));

const STORAGE_KEY = "school-shops:accent";

const applyPalette = (p: Palette) => {
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  set("--background", p.bg);
  set("--foreground", p.ink);
  set("--card", "#FFFFFF");
  set("--card-foreground", p.ink);
  set("--popover", "#FFFFFF");
  set("--popover-foreground", p.ink);
  set("--muted", p.muted);
  set("--muted-foreground", p.mutedInk);
  set("--accent", p.muted);
  set("--accent-foreground", p.ink);
  set("--primary", p.primary);
  set("--primary-foreground", p.onPrimary);
  set("--secondary", p.primary);
  set("--secondary-foreground", p.onPrimary);
  set("--ring", p.primary);
  set("--border", p.border);
  set("--input", p.input);
  // Follow the main tokens for the rest of the theme family.
  set("--chart-1", p.primary);
  set("--chart-2", p.primary);
  set("--chart-3", p.ink);
  set("--chart-4", p.mutedInk);
  set("--chart-5", p.input);
  set("--sidebar", p.bg);
  set("--sidebar-foreground", p.ink);
  set("--sidebar-primary", p.primary);
  set("--sidebar-primary-foreground", p.onPrimary);
  set("--sidebar-accent", p.muted);
  set("--sidebar-accent-foreground", p.ink);
  set("--sidebar-border", p.border);
  set("--sidebar-ring", p.primary);
};

/** Apply a palette now and remember the choice. */
export function applyAppColor(id: AppColorId) {
  const palette = PALETTES.find((p) => p.id === id) ?? PALETTES[0];
  applyPalette(palette);
  try {
    localStorage.setItem(STORAGE_KEY, palette.id);
  } catch {
    // storage unavailable — color applies for this session only
  }
}

/** Restore the saved choice. Call once at startup. */
export function initAppColor() {
  let id: string | null = null;
  try {
    id = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  const palette = PALETTES.find((p) => p.id === id);
  if (palette) applyPalette(palette);
}
