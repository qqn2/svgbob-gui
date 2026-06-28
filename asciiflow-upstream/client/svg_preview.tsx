import * as React from "react";
import { ExportDialog } from "#asciiflow/client/ExportDialog";
import { exportLayer, renderAsciiToSvg } from "#asciiflow/client/export_engine";
import { store, useAppStore } from "#asciiflow/client/store";
import { layerToSvgbobText } from "#asciiflow/client/svgbob_text";
import { layerToText } from "#asciiflow/client/text_utils";
import {
  initRenderer,
  getRendererInitError,
  isRendererReady,
} from "#asciiflow/client/renderer";
import { buildShareUrl } from "#asciiflow/client/svgbob_storage";
import { Button, Toast } from "#asciiflow/client/ui/components";
import styles from "#asciiflow/client/svg_preview.module.css";

type PreviewZoomMode = "sync" | "actual" | "fit";

const PREVIEW_ZOOM_MODE_KEY = "svgbob-gui:preview-zoom-mode";

function loadPreviewZoomMode(): PreviewZoomMode {
  try {
    const value = localStorage.getItem(PREVIEW_ZOOM_MODE_KEY);
    return value === "sync" || value === "actual" || value === "fit"
      ? value
      : "fit";
  } catch {
    return "fit";
  }
}

function savePreviewZoomMode(value: PreviewZoomMode) {
  try {
    localStorage.setItem(PREVIEW_ZOOM_MODE_KEY, value);
  } catch {
    // ignore
  }
}

function parseSvgDims(svg: string): string | null {
  const m = svg.match(/<svg[^>]*\swidth="([^"]+)"[^>]*\sheight="([^"]+)"/);
  if (m) return `${m[1]} × ${m[2]}`;
  const m2 = svg.match(/<svg[^>]*\sheight="([^"]+)"[^>]*\swidth="([^"]+)"/);
  if (m2) return `${m2[1]} × ${m2[2]}`;
  return null;
}

function parseSvgSize(svg: string): { width: number; height: number } | null {
  const m = svg.match(/<svg[^>]*\swidth="([^"]+)"[^>]*\sheight="([^"]+)"/);
  if (m) return parseSizePair(m[1], m[2]);
  const m2 = svg.match(/<svg[^>]*\sheight="([^"]+)"[^>]*\swidth="([^"]+)"/);
  if (m2) return parseSizePair(m2[2], m2[1]);
  return null;
}

function parseSizePair(width: string, height: string): { width: number; height: number } | null {
  const w = Number.parseFloat(width);
  const h = Number.parseFloat(height);
  return Number.isFinite(w) && Number.isFinite(h) ? { width: w, height: h } : null;
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

export function SvgPreview() {
  const canvasVersion = useAppStore((s) => s.canvasVersion);
  const route = useAppStore((s) => s.route);
  const zoom = store.currentCanvas.zoom;
  const mountRef = React.useRef<HTMLDivElement>(null);
  const [svg, setSvg] = React.useState("");
  const [sourceAscii, setSourceAscii] = React.useState("");
  const [ms, setMs] = React.useState<number | null>(null);
  const [dims, setDims] = React.useState<string | null>(null);
  const [svgSize, setSvgSize] = React.useState<{ width: number; height: number } | null>(null);
  const [mountSize, setMountSize] = React.useState({ width: 0, height: 0 });
  const [previewMode, setPreviewMode] = React.useState<PreviewZoomMode>(loadPreviewZoomMode);
  const [ready, setReady] = React.useState(false);
  const [initError, setInitError] = React.useState<string | null>(null);
  const [renderError, setRenderError] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState("");

  React.useEffect(() => {
    initRenderer()
      .then(() => {
        setReady(true);
        setInitError(null);
        store.setRenderState("ok");
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : getRendererInitError() ?? "WASM init failed";
        setInitError(msg);
        setReady(false);
        store.setRenderState("error");
      });
  }, []);

  React.useEffect(() => {
    if (!ready || !isRendererReady()) return;
    const id = window.setTimeout(() => {
      const preview = layerToSvgbobText(store.currentCanvas.combined);
      const source = layerToText(store.currentCanvas.committed);
      setSourceAscii(source);
      setRenderError(null);
      setSvg("");

      if (!preview.trim()) {
        setMs(null);
        setDims(null);
        setSvgSize(null);
        store.setRenderState("ok");
        return;
      }

      const t0 = performance.now();
      Promise.resolve(renderAsciiToSvg(preview))
        .then((result) => {
          setMs(performance.now() - t0);
          setSvg(result);
          setDims(parseSvgDims(result));
          setSvgSize(parseSvgSize(result));
          setRenderError(null);
          store.setRenderState("ok");
        })
        .catch((err) => {
          setMs(null);
          setSvg("");
          setDims(null);
          setSvgSize(null);
          setRenderError(
            err instanceof Error ? err.message : "svgbob render failed"
          );
          store.setRenderState("error");
        });
    }, 180);
    return () => window.clearTimeout(id);
  }, [canvasVersion, ready, route]);

  React.useEffect(() => {
    const element = mountRef.current;
    if (!element) return;
    const measure = () => {
      setMountSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    };
    measure();
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const showError = initError ?? renderError;
  const stats = asciiStats(sourceAscii);

  const previewScale = React.useMemo(() => {
    if (previewMode === "sync") return zoom;
    if (previewMode === "actual" || !svgSize) return 1;
    const availableWidth = Math.max(1, mountSize.width - 80);
    const availableHeight = Math.max(1, mountSize.height - 80);
    const scale = Math.min(
      availableWidth / svgSize.width,
      availableHeight / svgSize.height
    );
    return Math.max(0.1, Math.min(5, scale));
  }, [mountSize.height, mountSize.width, previewMode, svgSize, zoom]);

  const recenterPreview = React.useCallback(() => {
    const element = mountRef.current;
    if (!element) return;
    window.requestAnimationFrame(() => {
      element.scrollTo({
        left: Math.max(0, (element.scrollWidth - element.clientWidth) / 2),
        top: Math.max(0, (element.scrollHeight - element.clientHeight) / 2),
      });
    });
  }, []);

  const setPreviewZoomMode = (mode: PreviewZoomMode) => {
    setPreviewMode(mode);
    savePreviewZoomMode(mode);
  };

  React.useEffect(() => {
    if (previewMode === "fit" && svg) {
      recenterPreview();
    }
  }, [previewMode, previewScale, recenterPreview, svg]);

  const notify = async (fn: () => Promise<void> | void, ok: string) => {
    try {
      await fn();
      setToast(ok);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Action failed");
    }
  };

  const copyAscii = () => notify(() => copyText(sourceAscii), "ASCII copied");
  const copySvg = () =>
    notify(async () => {
      if (!sourceAscii || showError) throw new Error("Nothing to copy");
      await copyText(renderAsciiToSvg(layerToSvgbobText(store.currentCanvas.committed)));
    }, "SVG copied");

  const exportSvg = () =>
    notify(async () => {
      if (!sourceAscii || showError) return;
      await exportLayer(store.currentCanvas.committed, {
        format: "svg",
        scale: 1,
        background: "white",
        filenameBase: "diagram",
      });
      setToast("diagram.svg downloaded");
    }, "diagram.svg downloaded");

  const exportTxt = () =>
    notify(async () => {
      if (!sourceAscii) return;
      await exportLayer(store.currentCanvas.committed, {
        format: "txt",
        scale: 1,
        background: "white",
        filenameBase: "diagram",
      });
      setToast("diagram.txt downloaded");
    }, "diagram.txt downloaded");

  const shareLink = () =>
    notify(async () => {
      const url = buildShareUrl(layerToSvgbobText(store.currentCanvas.committed));
      if (!url) throw new Error("Diagram too large to share via URL");
      await copyText(url);
    }, "Share link copied");

  return (
    <aside className={styles.preview} aria-label="svgbob SVG preview">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>svgbob</span>
          <div className={styles.viewControls} aria-label="Preview zoom">
            {([
              ["sync", "sync"],
              ["actual", "1:1"],
              ["fit", "fit"],
            ] as Array<[PreviewZoomMode, string]>).map(([mode, label]) => (
              <Button
                key={mode}
                variant="ghost"
                className={[
                  styles.actionBtn,
                  previewMode === mode ? styles.actionBtnActive : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setPreviewZoomMode(mode)}
                title={
                  mode === "sync"
                    ? "Use canvas zoom"
                    : mode === "actual"
                    ? "Show SVG at actual size"
                    : "Fit SVG in preview"
                }
              >
                {label}
              </Button>
            ))}
            <Button
              variant="ghost"
              className={styles.actionBtn}
              onClick={recenterPreview}
              title="Recenter preview"
            >
              center
            </Button>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" className={styles.actionBtn} onClick={copyAscii} title="Copy committed ASCII">
            ASCII
          </Button>
          <Button variant="ghost" className={styles.actionBtn} onClick={exportTxt} title="Download diagram.txt">
            .txt
          </Button>
          <Button
            variant="ghost"
            className={styles.actionBtn}
            onClick={copySvg}
            title="Copy SVG from committed ASCII"
            disabled={!sourceAscii || !!showError}
          >
            SVG
          </Button>
          <Button
            variant="ghost"
            className={styles.actionBtn}
            onClick={exportSvg}
            title="Download diagram.svg"
            disabled={!sourceAscii || !!showError}
          >
            .svg
          </Button>
          <ExportDialog
            getLayer={() => store.currentCanvas.committed}
            trigger={
              <Button variant="ghost" className={styles.actionBtn} title="Export dialog" disabled={!sourceAscii}>
                export…
              </Button>
            }
          />
          <Button variant="ghost" className={styles.actionBtn} onClick={shareLink} title="Copy shareable URL">
            link
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
      <div className={styles.svgMount} ref={mountRef}>
        {svg ? (
          <div
            className={styles.svgScaler}
            style={
              svgSize
                ? {
                    width: svgSize.width * previewScale,
                    height: svgSize.height * previewScale,
                  }
                : undefined
            }
          >
            <div
              className={styles.svgContent}
              style={{ transform: `scale(${previewScale})` }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        ) : null}
      </div>
      <footer className={styles.footer}>
        <span>
          {stats.lines} lines · {stats.chars} chars (committed)
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
