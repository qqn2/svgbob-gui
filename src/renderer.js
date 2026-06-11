let convertFn = null;
let usingFallback = false;
export async function initRenderer() {
    try {
        const mod = await import('svgbob-wasm');
        if (typeof mod.render !== 'function') {
            throw new Error('svgbob-wasm: render export not found');
        }
        convertFn = mod.render;
    }
    catch (err) {
        console.warn('svgbob WASM init failed, falling back to Kroki API:', err);
        usingFallback = true;
    }
}
export function isUsingFallback() {
    return usingFallback;
}
export function renderSync(ascii) {
    if (!convertFn) {
        return errorSvg('Renderer not initialized');
    }
    try {
        return convertFn(ascii);
    }
    catch (e) {
        console.error('svgbob render error:', e);
        return errorSvg('Render error — check console');
    }
}
export async function renderAsync(ascii) {
    if (usingFallback) {
        return renderViaKroki(ascii);
    }
    return renderSync(ascii);
}
async function renderViaKroki(ascii) {
    const encoded = btoa(unescape(encodeURIComponent(ascii)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    const url = `https://kroki.io/svgbob/svg/${encoded}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Kroki API error: ${res.status}`);
    return res.text();
}
function errorSvg(message) {
    const safe = message.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40">
    <text x="10" y="24" fill="#cc4444" font-family="monospace" font-size="13">${safe}</text>
  </svg>`;
}
