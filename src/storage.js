const STORAGE_KEY = 'ascii-svg-editor:content';
const HASH_MAX_CHARS = 6000;
export function saveToLocalStorage(content) {
    try {
        localStorage.setItem(STORAGE_KEY, content);
    }
    catch {
        // Storage full or disabled
    }
}
export function loadFromLocalStorage() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    }
    catch {
        return null;
    }
}
export function saveToHash(content) {
    if (content.length > HASH_MAX_CHARS)
        return;
    try {
        const encoded = btoa(unescape(encodeURIComponent(content)));
        history.replaceState(null, '', `#${encoded}`);
    }
    catch {
        // URL too long or encoding error
    }
}
export function loadFromHash() {
    const hash = window.location.hash.slice(1);
    if (!hash)
        return null;
    try {
        return decodeURIComponent(escape(atob(hash)));
    }
    catch {
        return null;
    }
}
