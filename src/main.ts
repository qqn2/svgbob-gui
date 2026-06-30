import './style.css';
import { initRenderer, renderAsync, isUsingFallback } from './renderer';
import { createEditor, getValue, setValue, setEditorTheme } from './editor';
import { initToolbar } from './toolbar';
import { initResizer } from './resizer';
import { initDrawTools, refreshOverlay } from './drawTools';
import { applyTheme, loadTheme, toggleTheme, type AppTheme } from './theme';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  saveToHash,
  loadFromHash,
} from './storage';

const DEFAULT_DIAGRAM = '';

let debounceTimer: ReturnType<typeof setTimeout>;
const DEBOUNCE_MS = 180;

function syncThemeButton(theme: AppTheme): void {
  const btn = document.getElementById('btn-theme');
  if (btn) btn.textContent = theme === 'light' ? 'Dark' : 'Light';
}

async function main() {
  const loadingEl = createLoadingOverlay();
  document.body.appendChild(loadingEl);

  const appTheme = loadTheme();
  applyTheme(appTheme);
  syncThemeButton(appTheme);

  await initRenderer();

  const initialContent =
    loadFromHash() ??
    loadFromLocalStorage() ??
    DEFAULT_DIAGRAM;

  const notifyChange = (value: string) => {
    saveToLocalStorage(value);
    saveToHash(value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => updatePreview(value), DEBOUNCE_MS);
    updateEditorStatus(value);
    refreshOverlay();
  };

  const editorMount = document.getElementById('editor-mount')!;
  const editorView = createEditor(editorMount, initialContent, {
    onChange: notifyChange,
    onCursorMove: (line, col) => {
      const el = document.getElementById('cursor-pos');
      if (el) el.textContent = `${line}:${col}`;
    },
    onScroll: refreshOverlay,
  }, appTheme);

  const drawTools = document.getElementById('draw-tools')!;
  initDrawTools(drawTools, () => editorView, () => {
    notifyChange(getValue(editorView));
  });

  const snippetTools = document.getElementById('snippet-tools')!;
  initToolbar(snippetTools, () => editorView);

  const handle = document.getElementById('resize-handle')!;
  const panels = document.getElementById('panels')!;
  initResizer(handle, panels);

  bindActions(editorView);

  document.getElementById('btn-theme')?.addEventListener('click', () => {
    const theme = toggleTheme();
    setEditorTheme(editorView, theme);
    syncThemeButton(theme);
  });

  await updatePreview(initialContent);
  updateEditorStatus(initialContent);

  if (isUsingFallback()) {
    showToast('Using Kroki API (WASM unavailable) — requires network');
  }

  loadingEl.classList.add('hidden');
  setTimeout(() => loadingEl.remove(), 350);
}

async function updatePreview(ascii: string): Promise<void> {
  const t0 = performance.now();
  const svg = await renderAsync(ascii);
  const t1 = performance.now();

  const mount = document.getElementById('svg-mount')!;
  mount.innerHTML = svg;

  const svgEl = mount.querySelector('svg');
  if (svgEl) {
    svgEl.style.maxWidth = '100%';
    svgEl.style.height = 'auto';

    const w = svgEl.getAttribute('width');
    const h = svgEl.getAttribute('height');
    const timeEl = document.getElementById('render-time');
    const dimsEl = document.getElementById('svg-dims');
    if (timeEl) timeEl.textContent = `${(t1 - t0).toFixed(1)}ms`;
    if (dimsEl && w && h) dimsEl.textContent = `${w} × ${h}`;
  }
}

function updateEditorStatus(content: string): void {
  const charCount = document.getElementById('char-count');
  const lines = content.split('\n').length;
  if (charCount) charCount.textContent = `${lines} lines · ${content.length} chars`;
}

function bindActions(editorView: ReturnType<typeof createEditor>): void {
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('Clear the editor?')) {
      setValue(editorView, '');
    }
  });

  document.getElementById('btn-copy-ascii')?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(getValue(editorView));
    showToast('ASCII copied');
  });

  document.getElementById('btn-copy-svg')?.addEventListener('click', async () => {
    const svgEl = document.querySelector('#svg-mount svg');
    if (!svgEl) return;
    await navigator.clipboard.writeText(svgEl.outerHTML);
    showToast('SVG markup copied');
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    const svgEl = document.querySelector('#svg-mount svg');
    if (!svgEl) return;
    const serialized = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function showToast(message: string, durationMs = 2000): void {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('visible'));
  });
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

function createLoadingOverlay(): HTMLElement {
  const el = document.createElement('div');
  el.id = 'wasm-loading';
  el.innerHTML = '<span>⬡</span><span>Initializing renderer…</span>';
  return el;
}

main().catch(console.error);
