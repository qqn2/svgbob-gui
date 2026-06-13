export type ThemeMode = "light" | "light-grey" | "dark";

export const THEME_STORAGE_KEY = "svgbob-gui:theme";
export const UI_SCALE_STORAGE_KEY = "svgbob-gui:ui-font-scale";

export const UI_FONT_SCALES = [
  { id: "sm", value: 0.9, label: "S" },
  { id: "md", value: 1, label: "M" },
  { id: "lg", value: 1.1, label: "L" },
] as const;

function readLegacyDark(): boolean {
  try {
    return localStorage.getItem("darkMode") === "true";
  } catch {
    return false;
  }
}

export function loadThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "light-grey" || stored === "dark") {
      return stored;
    }
  } catch {
    // ignore
  }
  return readLegacyDark() ? "dark" : "light-grey";
}

export function loadUiFontScale(): number {
  try {
    const v = parseFloat(localStorage.getItem(UI_SCALE_STORAGE_KEY) ?? "");
    if (!Number.isNaN(v) && v >= 0.9 && v <= 1.15) return v;
  } catch {
    // ignore
  }
  return 1;
}

export function saveThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    localStorage.setItem("darkMode", mode === "dark" ? "true" : "false");
  } catch {
    // ignore
  }
}

export function saveUiFontScale(scale: number): void {
  try {
    localStorage.setItem(UI_SCALE_STORAGE_KEY, String(scale));
  } catch {
    // ignore
  }
}

export function applyThemeSettings(mode: ThemeMode, uiFontScale: number): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.classList.toggle("dark", mode === "dark");
  root.style.setProperty("--ui-font-scale", String(uiFontScale));
}
