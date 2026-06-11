const THEME_KEY = 'ascii-svg-editor:theme';
export function loadTheme() {
    try {
        const v = localStorage.getItem(THEME_KEY);
        if (v === 'dark' || v === 'light')
            return v;
    }
    catch {
        // ignore
    }
    return 'light';
}
export function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    }
    catch {
        // ignore
    }
}
export function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
}
export function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    saveTheme(next);
    return next;
}
