import { beforeEach, describe, expect, it } from "vitest";
import {
  loadThemeMode,
  loadUiFontScale,
  saveThemeMode,
  saveUiFontScale,
  THEME_STORAGE_KEY,
  UI_SCALE_STORAGE_KEY,
} from "#asciiflow/client/theme_settings";

describe("theme_settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to light-grey when unset", () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem("darkMode");
    expect(loadThemeMode()).toBe("light-grey");
  });

  it("migrates legacy darkMode flag", () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.setItem("darkMode", "true");
    expect(loadThemeMode()).toBe("dark");
  });

  it("persists theme and UI scale", () => {
    saveThemeMode("light");
    saveUiFontScale(1.1);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(loadUiFontScale()).toBe(1.1);
    localStorage.removeItem(UI_SCALE_STORAGE_KEY);
  });
});
