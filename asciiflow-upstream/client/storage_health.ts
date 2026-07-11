export const STORAGE_ERROR_EVENT = "svgbob-storage-error";

export function writeLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    window.dispatchEvent(new Event(STORAGE_ERROR_EVENT));
    return false;
  }
}
