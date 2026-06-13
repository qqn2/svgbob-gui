import { store, ToolMode, useAppStore } from "#asciiflow/client/store";
import { layerToText } from "#asciiflow/client/text_utils";
import styles from "#asciiflow/client/status_bar.module.css";
import * as React from "react";

const TOOL_LABELS: Record<number, string> = {
  [ToolMode.BOX]: "box",
  [ToolMode.SELECT]: "select",
  [ToolMode.FREEFORM]: "draw",
  [ToolMode.ARROWS]: "arrow",
  [ToolMode.LINES]: "line",
  [ToolMode.TEXT]: "text",
};

export function StatusBar() {
  const canvasVersion = useAppStore((s) => s.canvasVersion);
  const selectedToolMode = useAppStore((s) => s.selectedToolMode);
  const cursorCell = useAppStore((s) => s.cursorCell);
  const renderState = useAppStore((s) => s.renderState);
  const zoom = store.currentCanvas.zoom;
  const zoomPct = Math.round(zoom * 100);

  const ascii = layerToText(store.currentCanvas.committed);
  const lines = ascii ? ascii.split("\n").length : 0;
  const chars = ascii.length;
  const tool =
    store.placeBlockTool.isActive
      ? "place block"
      : TOOL_LABELS[selectedToolMode] ?? "—";

  return (
    <footer className={styles.statusBar} aria-label="Status">
      <div className={styles.left}>
        <span>
          cell {cursorCell ? `${cursorCell.x},${cursorCell.y}` : "—"}
        </span>
        <span className={styles.sep}>|</span>
        <span>{tool}</span>
        <span className={styles.sep}>|</span>
        <span>zoom {zoomPct}%</span>
      </div>
      <div className={styles.right}>
        <span>
          {lines} lines · {chars} chars
        </span>
        <span className={styles.sep}>|</span>
        <span className={renderState === "error" ? styles.error : ""}>
          {renderState === "error"
            ? "render error"
            : renderState === "ok"
            ? "WASM OK"
            : "WASM …"}
        </span>
      </div>
    </footer>
  );
}
