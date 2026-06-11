import * as React from "react";
import { store, useAppStore } from "#asciiflow/client/store";
import { layerToText } from "#asciiflow/client/text_utils";
import {
  initRenderer,
  renderAsync,
  getRendererInitError,
  isRendererReady,
} from "#asciiflow/client/renderer";
import { buildShareUrl } from "#asciiflow/client/svgbob_storage";
import { Button, Toast } from "#asciiflow/client/ui/components";
import styles from "#asciiflow/client/svg_preview.module.css";

const DARK_PREVIEW_KEY = "svgbob-gui:dark-preview";

function parseSvgDims(svg: string): string | null {
  const m = svg.match(/<svg[^>]*\swidth="([^"]+)"[^>]*\sheight="([^"]+)"/);
  if (m) return `${m[1]} × ${m[2]}`;
  const m2 = svg.match(/<svg[^>]*\sheight="([^"]+)"[^>]*\swidth="([^"]+)"/);
  if (m2) return `${m2[1]} × ${m2[2]}`;
  return null;
}

function asciiStats(text: string) {
  const lines = text ? text.split("\n").length : 0;
  return { lines, chars: text.length };
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    throw new Error("Clipboard permission denied");
  }
}

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SvgPreview() {
  const canvasVersion = useAppStore((s) => s.canvasVersion);
  const [svg, setSvg] = React.useState("");
  const [ascii, setAscii] = React.useState("");
  const [ms, setMs] = React.useState<number | null>(null);
  const [dims, setDims] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [darkPreview, setDarkPreview] = React.useState(() => {
    try {
      return localStorage.getItem(DARK_PREVIEW_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    initRenderer()
      .then(() => {
        setReady(true);
        setInitError(null);
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : getRendererInitError() ?? "WASM init failed";
        setInitError(msg);
        setReady(false);
      });
  }, []);

  React.useEffect(() => {
    if (!ready || !isRendererReady()) return;
    const id = window.setTimeout(() => {
      const text = layerToText(store.currentCanvas.combined);
      setAscii(text);
      setRenderError(null);
      setSvg("");
      const t0 = performance.now();
      renderAsync(text)
        .then((result) => {
          setMs(performance.now() - t0);
          setSvg(result);
          setDims(parseSvgDims(result));
          setRenderError(null);
        })
        .catch((err) => {
          setMs(null);
          setSvg("");
          setDims(null);
          setRenderError(
            err instanceof Error ? err.message : "svgbob render failed"
          );
        });
    }, 180);
    return () => window.clearTimeout(id);
  }, [canvasVersion, ready]);

  const showError = initError ?? renderError;

  const toggleDarkPreview = () => {
    const next = !darkPreview;
    setDarkPreview(next);
    try {
      localStorage.setItem(DARK_PREVIEW_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const notify = async (fn: () => Promise<void> | void, ok: string) => {
    try {
      await fn();
      setToast(ok);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Action failed");
    }
  };

  const copyAscii = () => notify(() => copyText(ascii), "ASCII copied");
  const copySvg = () => notify(() => copyText(svg), "SVG copied");

  const exportSvg = () => {
    if (!svg || showError) return;
    downloadBlob(svg, "diagram.svg", "image/svg+xml;charset=utf-8");
    setToast("diagram.svg downloaded");
  };

  const exportTxt = () => {
    if (!ascii) return;
    downloadBlob(ascii, "diagram.txt", "text/plain;charset=utf-8");
    setToast("diagram.txt downloaded");
  };

  const shareLink = () =>
    notify(async () => {
      const url = buildShareUrl(ascii);
      if (!url) throw new Error("Diagram too large to share via URL");
      await copyText(url);
    }, "Share link copied");

  const stats = asciiStats(ascii);

  return (
    <aside className={styles.preview} aria-label="svgbob SVG preview">
      <header className={styles.header}>
        <span className={styles.title}>svgbob</span>
        <div className={styles.actions}>
          <Button variant="ghost" className={styles.actionBtn} onClick={copyAscii} title="Copy ASCII">
            ASCII
          </Button>
          <Button variant="ghost" className={styles.actionBtn} onClick={exportTxt} title="Download diagram.txt">
            .txt
          </Button>
          <Button
            variant="ghost"
            className={styles.actionBtn}
            onClick={copySvg}
            title="Copy SVG markup"
            disabled={!svg || !!showError}
          >
            SVG
          </Button>
          <Button
            variant="ghost"
            className={styles.actionBtn}
            onClick={exportSvg}
            title="Download diagram.svg"
            disabled={!svg || !!showError}
          >
            .svg
          </Button>
          <Button variant="ghost" className={styles.actionBtn} onClick={shareLink} title="Copy shareable URL">
            link
          </Button>
          <Button
            variant="ghost"
            className={styles.actionBtn}
            onClick={toggleDarkPreview}
            title="Invert preview colors"
          >
            {darkPreview ? "light" : "dark"}
          </Button>
        </div>
      </header>
      {showError ? (
        <div className={styles.errorBanner} role="alert">
          <strong>Preview error</strong>
          <span>{showError}</span>
          <span className={styles.errorHint}>
            ASCII on the canvas is still your source of truth. Fix syntax or reload after WASM loads.
          </span>
        </div>
      ) : null}
      <div
        className={[styles.svgMount, darkPreview ? styles.svgMountDark : ""].filter(Boolean).join(" ")}
        dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      />
      <footer className={styles.footer}>
        <span>
          {stats.lines} lines · {stats.chars} chars
        </span>
        <span>
          {showError ? "render failed" : ms != null ? `${ms.toFixed(1)}ms` : "—"}
          {!showError && dims ? ` · ${dims}` : ""}
          {!showError && ready ? " · WASM" : ""}
        </span>
      </footer>
      <Toast open={!!toast} message={toast} onClose={() => setToast("")} duration={2000} />
    </aside>
  );
}
