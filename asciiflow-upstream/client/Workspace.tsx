import * as React from "react";
import styles from "#asciiflow/client/app.module.css";
import { PaneResizer } from "#asciiflow/client/PaneResizer";
import { SvgPreview } from "#asciiflow/client/svg_preview";
import { View } from "#asciiflow/client/view";
import { ToolMode, useAppStore } from "#asciiflow/client/store";

const RawEditor = React.lazy(() =>
  import("#asciiflow/client/RawEditor").then((module) => ({
    default: module.RawEditor,
  }))
);

const SPLIT_KEY = "svgbob-gui:split-percent";

function loadSplit(): number {
  try {
    const v = parseFloat(localStorage.getItem(SPLIT_KEY) ?? "");
    if (!Number.isNaN(v) && v >= 15 && v <= 85) return v;
  } catch {
    // ignore
  }
  return 50;
}

export function Workspace(
  viewProps: React.HTMLAttributes<HTMLCanvasElement>
) {
  const [split, setSplit] = React.useState(loadSplit);
  const selectedToolMode = useAppStore((state) => state.selectedToolMode);

  const onSplitChange = React.useCallback((pct: number) => {
    setSplit(pct);
    try {
      localStorage.setItem(SPLIT_KEY, String(pct));
    } catch {
      // ignore
    }
  }, []);

  return (
    <div id="workspace" className={styles.workspace}>
      <div
        data-pane="canvas"
        className={styles.canvasPane}
        style={{ flex: `0 0 ${split}%` }}
      >
        {selectedToolMode === ToolMode.RAW ? (
          <React.Suspense
            fallback={
              <div className={styles.rawEditorLoading} role="status">
                Loading editor…
              </div>
            }
          >
            <RawEditor />
          </React.Suspense>
        ) : (
          <View {...viewProps} />
        )}
      </div>
      <PaneResizer onSplitChange={onSplitChange} />
      <div className={styles.previewPane} style={{ flex: `1 1 ${100 - split}%` }}>
        <SvgPreview />
      </div>
    </div>
  );
}
